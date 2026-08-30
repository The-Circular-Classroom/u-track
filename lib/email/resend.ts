import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build')
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@u-track.app'

/**
 * Resolve a user's email address from Supabase Auth by their user ID.
 * Returns the email from Auth metadata, or null if not found.
 */
export async function resolveUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error || !data?.user) {
      return null
    }
    return data.user.email ?? null
  } catch {
    return null
  }
}

/**
 * Sends an email with retry logic. Retries once on failure.
 * If retry also fails, logs the error and returns without throwing.
 */
async function sendWithRetry(params: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const { to, subject, html } = params

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
    if (error) {
      throw new Error(error.message)
    }
  } catch (firstError) {
    // Retry once
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      })
      if (error) {
        throw new Error(error.message)
      }
    } catch (retryError) {
      // Log and continue without throwing
      const recipients = Array.isArray(to) ? to.join(', ') : to
      console.error(
        `[Email] Failed to send email after retry. Recipients: ${recipients}, Subject: ${subject}`,
        retryError
      )
    }
  }
}

/**
 * Send a CSV validation result email to the uploader.
 * - If status is 'passed': confirms file is awaiting approval.
 * - If status is 'failed': lists validation errors (up to 50).
 */
export async function sendCsvValidationEmail(params: {
  to: string
  fileName: string
  status: 'passed' | 'failed'
  totalRows: number
  failedRows?: number
  errors?: Array<{ row: number; message: string }>
}): Promise<void> {
  const { to, fileName, status, totalRows, failedRows, errors } = params

  if (status === 'passed') {
    const subject = `CSV Validation Passed: ${fileName}`
    const html = `
      <h2>CSV Validation Passed</h2>
      <p>Your uploaded file <strong>${fileName}</strong> has passed validation and is now awaiting admin approval.</p>
      <p><strong>Total rows:</strong> ${totalRows}</p>
      <p>You will be notified once the file has been reviewed and processed.</p>
    `
    await sendWithRetry({ to, subject, html })
  } else {
    const cappedErrors = (errors ?? []).slice(0, 50)
    const subject = `CSV Validation Failed: ${fileName}`
    const errorListHtml = cappedErrors.length > 0
      ? `
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr><th>Row</th><th>Error</th></tr>
          </thead>
          <tbody>
            ${cappedErrors.map(e => `<tr><td>${e.row}</td><td>${e.message}</td></tr>`).join('')}
          </tbody>
        </table>
      `
      : ''

    const html = `
      <h2>CSV Validation Failed</h2>
      <p>Your uploaded file <strong>${fileName}</strong> did not pass validation.</p>
      <p><strong>Total rows:</strong> ${totalRows}</p>
      <p><strong>Failed rows:</strong> ${failedRows ?? cappedErrors.length}</p>
      ${cappedErrors.length > 0 ? '<h3>Errors (up to 50):</h3>' + errorListHtml : ''}
      <p>Please correct the errors and re-upload the file.</p>
    `
    await sendWithRetry({ to, subject, html })
  }
}

/**
 * Send a CSV processed confirmation email to both the uploader and the approver.
 */
export async function sendCsvProcessedEmail(params: {
  to: string[]
  fileName: string
  recordsProcessed: number
}): Promise<void> {
  const { to, fileName, recordsProcessed } = params

  const subject = `CSV Processed Successfully: ${fileName}`
  const html = `
    <h2>CSV Processing Complete</h2>
    <p>The file <strong>${fileName}</strong> has been approved and successfully processed.</p>
    <p><strong>Records processed:</strong> ${recordsProcessed}</p>
    <p>All donation records have been created and inventory balances updated.</p>
  `
  await sendWithRetry({ to, subject, html })
}

/**
 * Send temporary password email to user.
 */
export async function sendTempPasswordEmail(params: {
  to: string
  tempPassword: string
  firstName?: string
}): Promise<void> {
  const { to, tempPassword, firstName } = params
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,'
  const subject = 'Your Temporary Password for U-Track'
  const html = `
    <h2>Temporary Password Notification</h2>
    <p>${greeting}</p>
    <p>An administrator has set a temporary password for your U-Track account.</p>
    <p><strong>Temporary Password:</strong> <code style="font-size: 1.1em; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
    <p>Please log in using this temporary password. Upon logging in, you will be required to create a new permanent password.</p>
  `
  await sendWithRetry({ to, subject, html })
}

