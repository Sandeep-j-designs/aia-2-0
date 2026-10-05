import React from "react";
import { FileImage, FileSpreadsheet, FileText } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Ported from FileIcon in js/icons.jsx.
 *
 * The original used literal #047857 / #dc2626. Those resolve to the production
 * success and destructive tokens here — which is a colour shift, because
 * production's greens and reds differ from the prototype's AA-tuned set. See
 * the token conflict note in the README.
 */

type Props = {
  ext: string;
  className?: string;
};

const FileIcon = ({ ext, className }: Props) => {
  const isSheet = ext === "xlsx" || ext === "xls" || ext === "csv";
  // Half of what the Inbox receives is a photographed bill, and every one of
  // them used to carry the PDF glyph in the PDF's red — so the upload list
  // claimed a file type the file did not have.
  const isImage = ["png", "jpg", "jpeg", "webp", "heic"].includes(ext);
  const Icon = isSheet ? FileSpreadsheet : isImage ? FileImage : FileText;

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 flex-none items-center justify-center rounded-md",
        "border border-neutral-gray bg-background",
        isSheet
          ? "text-success-green-foreground"
          : isImage
            ? "text-primary"
            : "text-destructive-foreground",
        className
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </span>
  );
};

export default FileIcon;
