'use client';


import Image from 'next/image';

interface Document {
  type: 'driving_license' | 'address_proof';
  status: 'pending' | 'approved' | 'rejected';
  file?: File;
  preview?: string;
  message?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Record<string, Document>>({
    driving_license: {
      type: 'driving_license',
      status: 'pending'
    },
    address_proof: {
      type: 'address_proof',
      status: 'pending'
    }
  });

  
    reader.onloadend = () => {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file,
          preview: reader.result as string,
          status: 'pending'
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  
    if (!doc.file) return;

    try {
      
      formData.append('file', doc.file);
      formData.append('type', type);

      // Replace with your API endpoint
      

      if (response.ok) {
        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            status: 'pending',
            message: 'Document uploaded successfully. Waiting for approval.'
          }
        }));
      } else {
        throw new Error('Failed to upload document');
      }
    } catch (error) {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'pending',
          message: 'Failed to upload document. Please try again.'
        }
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Document Verification</h1>
      
      <div className="space-y-8">
        {/* Driving License */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Driving License</h2>
          <div className="space-y-4">
            {documents.driving_license.preview ? (
              <div className="relative w-full h-48">
                <Image
                  src={documents.driving_license.preview}
                  alt="Driving License Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    
                    if (file) handleFileChange('driving_license', file);
                  }}
                  className="hidden"
                  id="driving_license"
                />
                <label
                  htmlFor="driving_license"
                  className="cursor-pointer text-gray-600 hover:text-gray-800"
                >
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>Click to upload or drag and drop</div>
                    <div className="text-sm text-gray-500">PNG, JPG, PDF up to 10MB</div>
                  </div>
                </label>
              </div>
            )}
            {documents.driving_license.preview && (
              <button
                onClick={() => handleUpload('driving_license')}
                className="w-full bg-yellow-400 text-black py-2 rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Upload Driving License
              </button>
            )}
            {documents.driving_license.message && (
              <p className={`text-sm ${
                documents.driving_license.status === 'approved' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {documents.driving_license.message}
              </p>
            )}
          </div>
        </div>

        {/* Address Proof */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Address Proof</h2>
          <div className="space-y-4">
            {documents.address_proof.preview ? (
              <div className="relative w-full h-48">
                <Image
                  src={documents.address_proof.preview}
                  alt="Address Proof Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    
                    if (file) handleFileChange('address_proof', file);
                  }}
                  className="hidden"
                  id="address_proof"
                />
                <label
                  htmlFor="address_proof"
                  className="cursor-pointer text-gray-600 hover:text-gray-800"
                >
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>Click to upload or drag and drop</div>
                    <div className="text-sm text-gray-500">PNG, JPG, PDF up to 10MB</div>
                  </div>
                </label>
              </div>
            )}
            {documents.address_proof.preview && (
              <button
                onClick={() => handleUpload('address_proof')}
                className="w-full bg-yellow-400 text-black py-2 rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Upload Address Proof
              </button>
            )}
            {documents.address_proof.message && (
              <p className={`text-sm ${
                documents.address_proof.status === 'approved' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {documents.address_proof.message}
              </p>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Note:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Please upload clear, readable copies of your documents</li>
            <li>Accepted address proofs: Aadhar Card, Passport, Voter ID, or Utility Bill</li>
            <li>Documents will be verified within 24-48 hours</li>
            <li>You will be notified once your documents are approved</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 