// components/TemplateUpload.tsx
"use client";

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Check, X } from 'lucide-react';

interface TemplateUploadProps {
  workspaceId?: string;
  onUploadComplete?: (template: any) => void;
}

export default function TemplateUpload({ workspaceId, onUploadComplete }: TemplateUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, templateName?: string) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('name', templateName || file.name.replace('.docx', ''));
      if (workspaceId) {
        formData.append('workspaceId', workspaceId);
      }

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(`Template "${data.template.name}" uploaded successfully with ${data.template.placeholders.length} placeholders`);
      onUploadComplete?.(data.template);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.name.endsWith('.docx')) {
        setError('Please upload a .docx file');
        return;
      }
      await handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm text-slate-600">Uploading template...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-slate-900">Upload Word Template</h3>
              <p className="text-sm text-slate-600 mt-1">
                Drag and drop your .docx template file here, or click to browse
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary inline-flex items-center gap-2"
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              Choose Template File
            </button>

            <div className="text-xs text-slate-500">
              Supported format: .docx only
            </div>
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Upload Successful</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Template Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Create placeholders in your Word document using curly braces: <code className="bg-blue-100 px-1 rounded">{'{patient_name}'}</code></li>
          <li>• Use descriptive names like <code className="bg-blue-100 px-1 rounded">{'{date_of_birth}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{diagnosis}'}</code></li>
          <li>• Placeholders will be automatically detected and can be filled with data</li>
          <li>• Keep the original formatting - it will be preserved in generated documents</li>
        </ul>
      </div>
    </div>
  );
}

// components/TemplateForm.tsx - For generating documents from templates
interface TemplateFormProps {
  template: {
    id: string;
    name: string;
    placeholders: string[];
  };
  onGenerate?: (document: Blob) => void;
}

export function TemplateForm({ template, onGenerate }: TemplateFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: template.id,
          data: formData,
          filename: `${template.name}_${new Date().toISOString().split('T')[0]}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const blob = await response.blob();
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      onGenerate?.(blob);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Generate from Template: {template.name}</h3>
        <p className="text-sm text-slate-600">Fill in the values for each placeholder</p>
      </div>

      <div className="grid gap-4">
        {template.placeholders.map((placeholder) => (
          <div key={placeholder}>
            <label className="label block mb-2 capitalize">
              {placeholder.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              value={formData[placeholder] || ''}
              onChange={(e) => handleInputChange(placeholder, e.target.value)}
              className="input w-full"
              placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || template.placeholders.length === 0}
        className="btn btn-primary w-full"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating Document...
          </>
        ) : (
          'Generate Document'
        )}
      </button>
    </div>
  );
}
