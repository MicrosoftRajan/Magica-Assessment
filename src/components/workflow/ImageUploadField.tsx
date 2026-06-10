"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import Image from "next/image";

interface ImageUploadFieldProps {
  imageUrl?: string;
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export function ImageUploadField({
  imageUrl,
  onUpload,
  disabled,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
      alert("Please upload a valid image (jpg, jpeg, png, webp, gif)");
      return;
    }

    setUploading(true);

    try {
      const transloaditRes = await fetch("/api/uploads/transloadit");
      if (transloaditRes.ok) {
        const { params, signature } = await transloaditRes.json();
        const formData = new FormData();
        formData.append("params", params);
        formData.append("signature", signature);
        formData.append("file", file);

        const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const assembly = await uploadRes.json();
          const assemblyId = assembly.assembly_id;

          let result = assembly;
          let attempts = 0;
          while (
            result.ok !== "ASSEMBLY_COMPLETED" &&
            attempts < 30
          ) {
            await new Promise((r) => setTimeout(r, 1000));
            const pollRes = await fetch(
              `https://api2.transloadit.com/assemblies/${assemblyId}`,
            );
            result = await pollRes.json();
            attempts++;
          }

          const url =
            result.results?.exported?.[0]?.url ??
            result.uploads?.[0]?.url;

          if (url) {
            onUpload(url);
            setUploading(false);
            return;
          }
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        onUpload(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        onUpload(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      {imageUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-[#e4e4e7]">
          <Image
            src={imageUrl}
            alt="Upload preview"
            width={240}
            height={120}
            className="w-full h-24 object-cover"
            loading="eager"
            unoptimized
          />
          {!disabled && (
            <button
              onClick={() => onUpload("")}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full flex flex-col items-center justify-center gap-1.5 py-6 border border-dashed border-[#e4e4e7] rounded-lg hover:border-[#3b82f6] hover:bg-blue-50/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-[#71717a] animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-[#71717a]" />
          )}
          <span className="text-xs text-[#71717a]">Upload Image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
