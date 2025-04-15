
import React, { useCallback, useState } from 'react';
import { Paperclip, X, File, Video, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  label: string;
  id: string;
  type?: 'document' | 'video';
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '*/*',
  multiple = false,
  maxFiles = 5,
  maxSize = 10, // Default 10MB
  files,
  setFiles,
  label,
  id,
  type = 'document',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Validate files
  const validateFiles = useCallback((fileList: FileList | null): File[] => {
    if (!fileList) return [];

    const validFiles: File[] = [];
    const fileArray = Array.from(fileList);
    let errorMessage = null;

    // Check for max number of files
    if (multiple && fileArray.length + files.length > maxFiles) {
      errorMessage = `You can only upload up to ${maxFiles} files`;
      setError(errorMessage);
      return validFiles;
    }

    // Validate file types and sizes
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        errorMessage = `File ${file.name} is too large. Max size is ${maxSize}MB`;
        continue;
      }

      // For documents, check if it's a PDF, DOC, DOCX
      if (type === 'document' && !file.type.match(/pdf|doc|docx|text|application\/*/)) {
        errorMessage = `File ${file.name} is not a valid document`;
        continue;
      }

      // For videos, check if it's a video file
      if (type === 'video' && !file.type.match(/video\/*/)) {
        errorMessage = `File ${file.name} is not a valid video`;
        continue;
      }

      validFiles.push(file);
    }

    if (errorMessage && validFiles.length === 0) {
      setError(errorMessage);
    } else {
      setError(null);
    }

    return validFiles;
  }, [files, maxFiles, maxSize, multiple, type]);

  // Handle dropped files
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const validFiles = validateFiles(e.dataTransfer.files);
    if (validFiles.length > 0) {
      if (multiple) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
      } else {
        setFiles([validFiles[0]]);
      }
    }
  }, [multiple, setFiles, validateFiles]);

  // Handle file input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = validateFiles(e.target.files);
    if (validFiles.length > 0) {
      if (multiple) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
      } else {
        setFiles([validFiles[0]]);
      }
    }
    // Reset the input
    e.target.value = '';
  }, [multiple, setFiles, validateFiles]);

  // Remove a file
  const removeFile = useCallback((index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setError(null);
  }, [setFiles]);

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-gray-100'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-4">
          {type === 'document' ? (
            <File className="h-10 w-10 text-gray-400 mb-2" />
          ) : (
            <Video className="h-10 w-10 text-gray-400 mb-2" />
          )}
          
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          
          <p className="text-xs text-gray-500 mb-2">
            Drag & drop or{' '}
            <label htmlFor={id} className="text-indigo-600 cursor-pointer">
              browse
            </label>
          </p>
          
          <p className="text-xs text-gray-500">
            {type === 'document' ? 'PDF, DOC, DOCX' : 'MP4, MOV, WebM'} up to {maxSize}MB
            {multiple && ` (Max ${maxFiles} files)`}
          </p>
          
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {files.length > 0 && (
        <div className="mt-2 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
              <div className="flex items-center space-x-2 truncate">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
