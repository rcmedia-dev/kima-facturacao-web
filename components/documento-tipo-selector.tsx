import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_DOCUMENTO } from "@/lib/constants";
import { TipoDocumento } from "@/lib/types";

interface DocumentoTipoSelectorProps {
  value: TipoDocumento;
  onChange: (value: TipoDocumento) => void;
  disabled?: boolean;
}

export function DocumentoTipoSelector({
  value,
  onChange,
  disabled = false,
}: DocumentoTipoSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TipoDocumento)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione o tipo" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(TIPOS_DOCUMENTO).map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {tipo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
