import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  onImageSelected: (base64: string, preview: string) => void;
  onImageRemoved: () => void;
  previewUrl: string | null;
  disabled?: boolean;
}

const ImageUpload = ({ onImageSelected, onImageRemoved, previewUrl, disabled }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setLoading(true);

    // Create preview
    const previewUrl = URL.createObjectURL(file);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      onImageSelected(base64, previewUrl);
      setLoading(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Uploaded preview"
            className="w-full max-h-[300px] object-contain bg-muted"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={onImageRemoved}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-24 border-dashed border-2 flex flex-col gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tải ảnh lên để kiểm tra
              </span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;
