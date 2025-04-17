
import React, { useCallback, useState } from 'react';
import { Paperclip, X, File, Video, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  label: string;
  id: string;
  type?: 'document' | 'video' | 'image';
  required?: boolean;
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
  required = false,
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

  // Get appropriate file type for validation
  const getFileTypeRegex = useCallback(() => {
    switch (type) {
      case 'document':
        return /pdf|doc|docx|text|application\/*/;
      case 'video':
        return /video\/*/;
      case 'image':
        return /image\/*/;
      default:
        return /.*/;
    }
  }, [type]);

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
      toast({
        title: "Too many files",
        description: errorMessage,
        variant: "destructive"
      });
      return validFiles;
    }

    const fileTypeRegex = getFileTypeRegex();

    // Validate file types and sizes
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        errorMessage = `File ${file.name} is too large. Max size is ${maxSize}MB`;
        toast({
          title: "File too large",
          description: errorMessage,
          variant: "destructive"
        });
        continue;
      }

      // Check file type
      if (!file.type.match(fileTypeRegex)) {
        errorMessage = `File ${file.name} is not a valid ${type}`;
        toast({
          title: "Invalid file type",
          description: errorMessage,
          variant: "destructive"
        });
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
  }, [files, maxFiles, maxSize, multiple, type, getFileTypeRegex]);

  // Handle dropped files
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const validFiles = validateFiles(e.dataTransfer.files);
    if (validFiles.length > 0) {
      if (multiple) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
        toast({
          title: "Files added",
          description: `${validFiles.length} files were added successfully`,
        });
      } else {
        setFiles([validFiles[0]]);
        toast({
          title: "File added",
          description: `${validFiles[0].name} was added successfully`,
        });
      }
    }
  }, [multiple, setFiles, validateFiles]);

  // Handle file input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = validateFiles(e.target.files);
    if (validFiles.length > 0) {
      if (multiple) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
        toast({
          title: "Files added",
          description: `${validFiles.length} files were added successfully`,
        });
      } else {
        setFiles([validFiles[0]]);
        toast({
          title: "File added",
          description: `${validFiles[0].name} was added successfully`,
        });
      }
    }
    // Reset the input
    e.target.value = '';
  }, [multiple, setFiles, validateFiles]);

  // Remove a file
  const removeFile = useCallback((index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setError(null);
    toast({
      title: "File removed",
      description: "The file was removed successfully",
    });
  }, [setFiles]);

  // Get the appropriate icon
  const getIcon = () => {
    switch (type) {
      case 'document':
        return <File className="h-10 w-10 text-gray-400 mb-2" />;
      case 'video':
        return <Video className="h-10 w-10 text-gray-400 mb-2" />;
      case 'image':
        return <Upload className="h-10 w-10 text-gray-400 mb-2" />;
      default:
        return <File className="h-10 w-10 text-gray-400 mb-2" />;
    }
  };

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
          {getIcon()}
          
          <p className="text-sm text-gray-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</p>
          
          <p className="text-xs text-gray-500 mb-2">
            Drag & drop or{' '}
            <label htmlFor={id} className="text-indigo-600 cursor-pointer">
              browse
            </label>
          </p>
          
          <p className="text-xs text-gray-500">
            {type === 'document' ? 'PDF, DOC, DOCX' : type === 'image' ? 'JPG, PNG, GIF' : 'MP4, MOV, WebM'} up to {maxSize}MB
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
