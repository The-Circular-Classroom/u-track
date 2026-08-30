import { createClient } from '@supabase/supabase-js'
import postgres from 'npm:postgres'
import * as XLSX from 'npm:xlsx'
import { parse } from 'npm:csv-parse/sync'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationError {
  row: number
  field: string
  message: string
}

function parseFile(buffer: Uint8Array, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()

  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
    throw new Error(`Unsupported file format: .${extension ?? '(none)'}. Accepted formats: .csv, .xls, .xlsx`)
  }

  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('File contains no worksheets')
  }

  const sheet = workbook.Sheets[sheetName]
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (rawData.length === 0) {
    throw new Error('File is empty')
  }

  const headers = rawData[0].map((h) => String(h).trim())
  const nonEmptyRows = rawData.slice(1).filter((row) =>
    row.some((cell) => String(cell).trim() !== '')
  )

  const rows = nonEmptyRows.map((row) => {
    const parsedRow: Record<string, string> = {}
    headers.forEach((header, index) => {
      parsedRow[header] = index < row.length ? String(row[index]).trim() : ''
    })
    return parsedRow
  })

  return { headers, rows }
}

function mapStorageLocation(value: string): string {
  const normalized = value.toLowerCase().trim()
  if (normalized === 'tcc') return 'tcc'
  if (normalized === 'exited') return 'exited'
  return 'school'
}

function mapItemStatus(value: string): string {
  const normalized = value.toLowerCase().trim()
  switch (normalized) {
    case 'for_sale':
    case 'forsale':
      return 'for_sale'
    case 'for_repurpose':
    case 'for_repurposing':
    case 'forrepurpose':
      return 'for_repurpose'
    case 'general_office':
    case 'generaloffice':
      return 'general_office'
    case 'sold':
      return 'sold'
    case 'repurposed':
      return 'repurposed'
    case 'disposed':
      return 'disposed'
    default:
      return 'for_sale'
  }
}

async function sendEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@u-track.app'
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email notification')
    return
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
      }),
    })
    if (!response.ok) {
      const errText = await response.text()
      console.error(`Failed to send email via Resend: ${errText}`)
    }
  } catch (err) {
    console.error('Failed to send email:', err)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, filePath, approverUserId } = await req.json()

    if (!filePath) {
      return new Response(JSON.stringify({ error: 'missing_field', message: 'filePath is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('donations')
      .download(filePath)

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: 'download_failed', message: `Failed to download file: ${downloadError?.message ?? 'File not found'}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    const filename = filePath.split('/').pop() ?? filePath

    const { headers, rows } = parseFile(buffer, filename)

    // Connect to PG database
    const dbUrl = Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set')
    }
    const sql = postgres(dbUrl)

    if (action === 'validate') {
      const errors: ValidationError[] = []
      const requiredFields = [
        'item_type_id',
        'size_name',
        'user_id',
        'school_id',
        'donation_drive_id',
        'to_stored_at',
        'quantity',
        'to_status',
      ] as const

      const invalidRowIndices = new Set<number>()

      function addError(rowNum: number, field: string, message: string) {
        if (errors.length < 50) {
          errors.push({ row: rowNum, field, message })
        }
        invalidRowIndices.add(rowNum)
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 1

        // Check required fields
        const missingFields = requiredFields.filter(
          (field) => !row[field] || row[field].trim() === ''
        )
        if (missingFields.length > 0) {
          for (const field of missingFields) {
            addError(rowNumber, field, `Required field "${field}" is missing or empty`)
            if (errors.length >= 50) break
          }
          continue
        }

        // Check forbidden combination
        if (
          row.to_stored_at.toLowerCase().trim() === 'school' &&
          row.to_status.toLowerCase().trim() === 'for_repurposing'
        ) {
          addError(
            rowNumber,
            'to_stored_at',
            'Storage location "school" with status "for_repurposing" is not permitted'
          )
          if (errors.length >= 50) continue
        }

        // Validate user
        const userId = parseInt(row.user_id, 10)
        let dbUser: any = null
        if (!isNaN(userId)) {
          const users = await sql`select id, is_active, school_id, email from users where id = ${userId}`
          dbUser = users[0]
          if (!dbUser) {
            addError(rowNumber, 'user_id', `User with id ${row.user_id} does not exist`)
          } else if (!dbUser.is_active) {
            addError(rowNumber, 'user_id', `User with id ${row.user_id} is not active`)
          }
        } else {
          addError(rowNumber, 'user_id', `Invalid user_id value: "${row.user_id}"`)
        }
        if (errors.length >= 50) continue

        // Validate school
        const schoolId = parseInt(row.school_id, 10)
        let dbSchool: any = null
        if (!isNaN(schoolId)) {
          const schools = await sql`select id, is_cooperating from schools where id = ${schoolId}`
          dbSchool = schools[0]
          if (!dbSchool) {
            addError(rowNumber, 'school_id', `School with id ${row.school_id} does not exist`)
          } else if (!dbSchool.is_cooperating) {
            addError(rowNumber, 'school_id', `School with id ${row.school_id} is not cooperating`)
          }
        } else {
          addError(rowNumber, 'school_id', `Invalid school_id value: "${row.school_id}"`)
        }
        if (errors.length >= 50) continue

        // Validate donation drive
        const donationDriveId = parseInt(row.donation_drive_id, 10)
        if (!isNaN(donationDriveId)) {
          const drives = await sql`select id, start_date, end_date, school_id from donation_drives where id = ${donationDriveId}`
          const drive = drives[0]
          if (!drive) {
            addError(
              rowNumber,
              'donation_drive_id',
              `Donation drive with id ${row.donation_drive_id} does not exist`
            )
          } else {
            const now = new Date()
            const startDate = new Date(drive.start_date)
            const endDate = new Date(drive.end_date)

            if (now < startDate || now > endDate) {
              addError(
                rowNumber,
                'donation_drive_id',
                `Donation drive with id ${row.donation_drive_id} is not active. Valid date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
              )
            }

            if (drive.school_id !== schoolId) {
              addError(
                rowNumber,
                'donation_drive_id',
                `Donation drive with id ${row.donation_drive_id} does not belong to school with id ${row.school_id}`
              )
            }
          }
        } else {
          addError(
            rowNumber,
            'donation_drive_id',
            `Invalid donation_drive_id value: "${row.donation_drive_id}"`
          )
        }
        if (errors.length >= 50) continue

        // Validate item type
        const itemTypeId = parseInt(row.item_type_id, 10)
        let dbItemType: any = null
        if (!isNaN(itemTypeId)) {
          const itemTypes = await sql`select id, size_category_id from item_types where id = ${itemTypeId}`
          dbItemType = itemTypes[0]
          if (!dbItemType) {
            addError(
              rowNumber,
              'item_type_id',
              `Item type with id ${row.item_type_id} does not exist`
            )
          } else {
            // Validate size option
            const sizes = await sql`select id from size_options where size_category_id = ${dbItemType.size_category_id} and size_name = ${row.size_name}`
            if (sizes.length === 0) {
              addError(
                rowNumber,
                'size_name',
                `Size "${row.size_name}" does not exist for item type with id ${row.item_type_id}`
              )
            }
          }
        } else {
          addError(
            rowNumber,
            'item_type_id',
            `Invalid item_type_id value: "${row.item_type_id}"`
          )
        }
        if (errors.length >= 50) continue

        // Validate user school permission
        if (dbUser && dbSchool) {
          if (dbUser.school_id !== schoolId) {
            addError(
              rowNumber,
              'user_id',
              `User ${row.user_id} does not have permission for school ${row.school_id}`
            )
          }
        }
      }

      const isValid = errors.length === 0
      const failedPath = filePath.replace(/^pre-processing\//, 'failed/')
      const validatedPath = filePath.replace(/^pre-processing\//, 'validated/')
      const newPath = isValid ? validatedPath : failedPath

      // Move file
      const { error: moveError } = await supabase.storage
        .from('donations')
        .move(filePath, newPath)

      if (moveError) {
        throw new Error(`Failed to move file to ${newPath}: ${moveError.message}`)
      }

      // Send validation email to uploader
      if (rows.length > 0) {
        const uploaderId = parseInt(rows[0].user_id, 10)
        if (!isNaN(uploaderId)) {
          const users = await sql`select email from users where id = ${uploaderId}`
          const uploader = users[0]
          if (uploader?.email) {
            if (isValid) {
              const html = `
                <h2>CSV Validation Passed</h2>
                <p>Your uploaded file <strong>${filename}</strong> has passed validation and is now awaiting admin approval.</p>
                <p><strong>Total rows:</strong> ${rows.length}</p>
                <p>You will be notified once the file has been reviewed and processed.</p>
              `
              await sendEmail({
                to: [uploader.email],
                subject: `CSV Validation Passed: ${filename}`,
                html,
              })
            } else {
              const errorListHtml = errors
                .map((e) => `<tr><td>${e.row}</td><td>${e.message}</td></tr>`)
                .join('')
              const html = `
                <h2>CSV Validation Failed</h2>
                <p>Your uploaded file <strong>${filename}</strong> did not pass validation.</p>
                <p><strong>Total rows:</strong> ${rows.length}</p>
                <p><strong>Failed rows:</strong> ${invalidRowIndices.size}</p>
                <h3>Errors (up to 50):</h3>
                <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">
                  <thead>
                    <tr><th>Row</th><th>Error</th></tr>
                  </thead>
                  <tbody>
                    ${errorListHtml}
                  </tbody>
                </table>
                <p>Please correct the errors and re-upload the file.</p>
              `
              await sendEmail({
                to: [uploader.email],
                subject: `CSV Validation Failed: ${filename}`,
                html,
              })
            }
          }
        }
      }

      await sql.end()

      return new Response(
        JSON.stringify({
          success: isValid,
          status: isValid ? 'validated' : 'failed',
          filePath: newPath,
          totalRows: rows.length,
          validRows: rows.length - invalidRowIndices.size,
          invalidRows: invalidRowIndices.size,
          errors,
        }),
        {
          status: isValid ? 200 : 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'approve') {
      let transactionsCreated = 0
      let balancesUpdated = 0

      try {
        await sql.begin(async (sqlTrans) => {
          for (const row of rows) {
            const itemTypeId = parseInt(row.item_type_id, 10)
            const userId = parseInt(row.user_id, 10)
            const donationDriveId = parseInt(row.donation_drive_id, 10)
            const quantity = parseInt(row.quantity, 10)
            const toStoredAt = mapStorageLocation(row.to_stored_at)
            const toStatus = mapItemStatus(row.to_status)

            // Get size option ID
            const itemTypes = await sqlTrans`select size_category_id from item_types where id = ${itemTypeId}`
            const itemType = itemTypes[0]
            if (!itemType) {
              throw new Error(`Item type not found for id ${itemTypeId}`)
            }

            const sizeOptions = await sqlTrans`select id from size_options where size_category_id = ${itemType.size_category_id} and size_name = ${row.size_name}`
            const sizeOption = sizeOptions[0]
            if (!sizeOption) {
              throw new Error(`Size option "${row.size_name}" not found for item type id ${itemTypeId}`)
            }

            // Create Transaction record
            await sqlTrans`
              insert into transactions (
                item_type_id, size_option_id, user_id, donation_drive_id, quantity,
                transaction_type, from_status, to_status, from_stored_at, to_stored_at,
                remarks
              ) values (
                ${itemTypeId}, ${sizeOption.id}, ${userId}, ${donationDriveId}, ${quantity},
                'donation_in', null, ${toStatus}, null, ${toStoredAt},
                ${row.remarks || null}
              )
            `
            transactionsCreated++

            // Upsert InventoryBalance record
            const balances = await sqlTrans`
              insert into inventory_balance (
                item_type_id, size_option_id, item_status, stored_at, quantity
              ) values (
                ${itemTypeId}, ${sizeOption.id}, ${toStatus}, ${toStoredAt}, ${quantity}
              )
              on conflict (item_type_id, size_option_id, item_status, stored_at)
              do update set quantity = inventory_balance.quantity + excluded.quantity
              returning id
            `
            if (balances.length > 0) {
              balancesUpdated++
            }
          }
        })

        // Move file from validated/ to processed/
        const processedPath = filePath.replace(/^validated\//, 'processed/')
        const { error: moveError } = await supabase.storage
          .from('donations')
          .move(filePath, processedPath)

        // Email notifications
        const emails: string[] = []
        if (rows.length > 0) {
          const uploaderId = parseInt(rows[0].user_id, 10)
          if (!isNaN(uploaderId)) {
            const users = await sql`select email from users where id = ${uploaderId}`
            if (users[0]?.email) {
              emails.push(users[0].email)
            }
          }
        }
        if (approverUserId) {
          const approverId = parseInt(approverUserId, 10)
          if (!isNaN(approverId)) {
            const users = await sql`select email from users where id = ${approverId}`
            if (users[0]?.email) {
              emails.push(users[0].email)
            }
          }
        }

        const uniqueEmails = [...new Set(emails)]
        if (uniqueEmails.length > 0) {
          const html = `
            <h2>CSV Processing Complete</h2>
            <p>The file <strong>${filename}</strong> has been approved and successfully processed.</p>
            <p><strong>Records processed:</strong> ${transactionsCreated}</p>
            <p>All donation records have been created and inventory balances updated.</p>
          `
          await sendEmail({
            to: uniqueEmails,
            subject: `CSV Processed Successfully: ${filename}`,
            html,
          })
        }

        await sql.end()

        return new Response(
          JSON.stringify({
            status: 'processed',
            transactionsCreated,
            balancesUpdated,
            ...(moveError ? { warning: `Database records created successfully but file move failed: ${moveError.message}` } : {}),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )

      } catch (err: any) {
        // Rollback is automatic on transaction failure in postgresjs when using sql.begin
        console.error('Database transaction failed:', err)

        // Send failure email
        const emails: string[] = []
        if (rows.length > 0) {
          const uploaderId = parseInt(rows[0].user_id, 10)
          if (!isNaN(uploaderId)) {
            const users = await sql`select email from users where id = ${uploaderId}`
            if (users[0]?.email) {
              emails.push(users[0].email)
            }
          }
        }
        const uniqueEmails = [...new Set(emails)]
        if (uniqueEmails.length > 0) {
          const html = `
            <h2>CSV Processing Failed</h2>
            <p>The file <strong>${filename}</strong> failed during processing.</p>
            <p><strong>Error:</strong> ${err.message || 'Unknown database error'}</p>
            <p>No database changes were committed. Please verify the file and try again.</p>
          `
          await sendEmail({
            to: uniqueEmails,
            subject: `CSV Processing Failed: ${filename}`,
            html,
          })
        }

        await sql.end()

        return new Response(
          JSON.stringify({
            error: 'processing_failed',
            message: err.message || 'Failed to process CSV file',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return new Response(JSON.stringify({ error: 'invalid_action', message: 'Action must be validate or approve' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'internal_error', message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
