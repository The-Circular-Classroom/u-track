// @ts-nocheck
export default function ColorCard({ color, onClick }) {
  const totalQuantity = color.totalQuantity || 0;
  const colorName = color.displayName || color.colorName || 'Unknown Color';

  // Color mapping for common colors
  const getColorClass = (colorName) => {
    const colorMap = {
      'blue': 'bg-blue-500',
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'yellow': 'bg-yellow-500',
      'purple': 'bg-purple-500',
      'pink': 'bg-pink-500',
      'orange': 'bg-orange-500',
      'black': 'bg-black',
      'white': 'bg-white border-2 border-gray-300',
      'gray': 'bg-gray-500',
      'grey': 'bg-gray-500',
      'brown': 'bg-amber-700',
      'navy': 'bg-blue-900',
      'maroon': 'bg-red-900',
      'teal': 'bg-teal-500',
      'cyan': 'bg-cyan-500',
    };

    const normalizedColor = colorName.toLowerCase();
    for (const [key, className] of Object.entries(colorMap)) {
      if (normalizedColor.includes(key)) {
        return className;
      }
    }
    return 'bg-gray-400';
  };

  const hex = color?.colorHex || color?.hexCode || color?.hex;
  const isWhite = hex && ['#fff', '#ffffff', 'white'].includes(String(hex).toLowerCase());

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer hover:border-gray-200 p-4 flex items-center gap-4"
    >
      {/* Color Swatch */}
      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
        <div
          className={`w-full h-full ${hex ? '' : getColorClass(colorName)}`}
          style={hex ? { backgroundColor: hex, border: isWhite ? '1px solid rgb(209 213 219)' : undefined } : undefined}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-gray-900 truncate mb-1">
          {colorName}
        </h3>
        <p className="text-sm text-gray-500">{totalQuantity.toLocaleString()} items</p>
      </div>
    </div>
  );
}