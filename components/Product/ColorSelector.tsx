type Props = {
    colors: string[]
    selectedColor: string | null
    onSelect: (color: string) => void
  }
  
  export function ColorSelector({ colors, selectedColor, onSelect }: Props) {
    return (
      <div className="flex items-center gap-3 py-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`w-7 h-7 rounded-full border transition ${
              selectedColor === color
                ? "ring-2 ring-foreground scale-110"
                : "hover:scale-105"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    )
  }