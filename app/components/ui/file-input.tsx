'use client';

import * as React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { cn } from '@/lib/utils';

const variants = {
  base: 'relative rounded-md flex justify-center items-center flex-col cursor-pointer min-h-[150px] min-w-[200px] border border-dashed border-gray-400 dark:border-gray-300 transition-colors duration-200 ease-in-out',
  active: 'border-2',
  disabled: 'bg-gray-200 cursor-default pointer-events-none bg-opacity-30 dark:bg-gray-700',
  accept: 'border border-blue-500 bg-blue-500 bg-opacity-10',
  reject: 'border border-red-700 bg-red-700 bg-opacity-10',
};

export type FileInputProps = {
  className?: string;
  value?: File[];
  onChange?: (files: File[]) => void | Promise<void>;
  onFilesAdded?: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  dropzoneOptions?: Omit<DropzoneOptions, 'disabled'>;
};

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    { className, value, onChange, onFilesAdded, disabled, dropzoneOptions },
    ref,
  ) => {
    const [files, setFiles] = React.useState<File[]>(value || []);

    const onDrop = React.useCallback(
      (acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles];
        setFiles(newFiles);
        onChange?.(newFiles);
        onFilesAdded?.(acceptedFiles);
      },
      [files, onChange, onFilesAdded],
    );

    const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
      useDropzone({
        onDrop,
        disabled,
        ...dropzoneOptions,
      });

    return (
      <div
        {...getRootProps({
          className: cn(
            variants.base,
            isDragActive && variants.active,
            isDragAccept && variants.accept,
            isDragReject && variants.reject,
            disabled && variants.disabled,
            className,
          ),
        })}
      >
        <input ref={ref} {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-xs text-gray-400">
          <span className="text-gray-600 dark:text-gray-400">
            Drop files here or click to upload
          </span>
        </div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center rounded-md bg-white px-2 py-1 text-xs"
              >
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  className="ml-1 rounded-md p-1 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFiles = files.filter((_, index) => index !== i);
                    setFiles(newFiles);
                    onChange?.(newFiles);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
FileInput.displayName = 'FileInput';

export { FileInput }; 