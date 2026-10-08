type Props = {
    sizes: any[]
    selectedSizeId: string | null
    onSelect: (id: string, label: string) => void
  }
  
  export function SizeSelector({ sizes, selectedSizeId, onSelect }: Props) {
    return (
      <div className="flex flex-wrap gap-3">
        {sizes.map((s) => {
          const isSelected = selectedSizeId === s.id
  
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id, s.size)}
              className={`min-w-[48px] px-4 py-2 text-sm border rounded-md transition ${
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/25 hover:border-foreground"
              }`}
            >
              {s.size}
            </button>
          )
        })}
      </div>
    )
  }