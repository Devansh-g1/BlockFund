
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import Header from '@/components/Header';
import { ethers } from 'ethers';
import { dateToTimestamp } from '@/utils/contractUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import FileUploader from '@/components/FileUploader';
import { CampaignFormData } from '@/types/campaign';
import { uploadFileToIPFS, uploadFilesToIPFS } from '@/utils/ipfsUtils';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { contract, address, isConnected, connectWallet, isVerifiedCreator } = useWeb3();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    target: '',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    image: null,
    documents: [],
    videos: []
  });
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setFormData({
      ...formData,
      deadline: date
    });
    
    // Clear error for this field
    if (errors.deadline) {
      setErrors({
        ...errors,
        deadline: ''
      });
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({
        ...formData,
        image: e.target.files[0]
      });
      
      // Clear error for this field
      if (errors.image) {
        setErrors({
          ...errors,
          image: ''
        });
      }
    }
  };

  // Handle document files
  const handleDocumentsChange = (files: File[]) => {
    setFormData({
      ...formData,
      documents: files
    });
  };

  // Handle video files
  const handleVideosChange = (files: File[]) => {
    setFormData({
      ...formData,
      videos: files
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.target || parseFloat(formData.target) <= 0) {
      newErrors.target = 'Target amount must be greater than 0';
    }
    
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (formData.deadline.getTime() <= Date.now()) {
      newErrors.deadline = 'Deadline must be in the future';
    }
    
    if (!formData.image) {
      newErrors.image = 'Campaign image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      await connectWallet();
      return;
    }
    
    if (!isVerifiedCreator) {
      toast({
        title: 'Not Verified',
        description: 'You must be a verified creator to create campaigns',
        variant: 'destructive'
      });
      return;
    }
    
    if (!validateForm()) {
      toast({
        title: 'Form Incomplete',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Upload files to IPFS
      toast({
        title: 'Uploading Files',
        description: 'Your files are being uploaded to IPFS'
      });
      
      // Upload campaign image
      const imageUrl = formData.image ? await uploadFileToIPFS(formData.image) : '';
      
      // Upload documents
      const documentUrls = formData.documents.length > 0 
        ? await uploadFilesToIPFS(formData.documents) 
        : [];
      
      // Upload videos
      const videoUrls = formData.videos.length > 0 
        ? await uploadFilesToIPFS(formData.videos) 
        : [];
      
      // Only use contract if connected to blockchain
      if (contract) {
        toast({
          title: 'Creating Campaign',
          description: 'Submitting campaign to the blockchain'
        });
        
        // Convert ETH to Wei
        const targetInWei = ethers.utils.parseEther(formData.target);
        
        // Convert deadline to UNIX timestamp
        const deadlineTimestamp = dateToTimestamp(formData.deadline);
        
        // Create campaign transaction
        const transaction = await contract.createCampaign(
          formData.title,
          formData.description,
          targetInWei,
          deadlineTimestamp,
          imageUrl,
          documentUrls,
          videoUrls
        );
        
        // Wait for transaction to be mined
        await transaction.wait();
        
        toast({
          title: 'Campaign Created',
          description: 'Your campaign has been successfully created',
          variant: 'default'
        });
        
        // Navigate to home page to see the new campaign
        navigate('/');
      } else {
        // Mock success for demo
        setTimeout(() => {
          toast({
            title: 'Demo Mode',
            description: 'In a real app, your campaign would be created on the blockchain',
            variant: 'default'
          });
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Creation Failed',
        description: 'There was an error creating your campaign',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          Back to Home
        </button>
        
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
              <p className="text-gray-600 mt-1">
                Launch your crowdfunding campaign on the blockchain
              </p>
            </div>
            
            {!isConnected ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                <h2 className="text-xl font-medium mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600 mb-6">
                  You need to connect your wallet before creating a campaign
                </p>
                <Button 
                  onClick={connectWallet} 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Connect Wallet
                </Button>
              </div>
            ) : !isVerifiedCreator ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-medium mb-2">Verification Required</h2>
                <p className="text-gray-600 mb-2">
                  Your account is not verified to create campaigns.
                </p>
                <p className="text-gray-600 mb-6">
                  Contact the platform administrator to get verified.
                </p>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                >
                  Back to Home
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Campaign Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Enter campaign title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`mt-1 ${errors.title ? 'border-red-500' : ''}`}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Campaign Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your campaign in detail"
                      value={formData.description}
                      onChange={handleInputChange}
                      className={`mt-1 min-h-32 ${errors.description ? 'border-red-500' : ''}`}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="target">Funding Target (ETH)</Label>
                      <Input
                        id="target"
                        name="target"
                        type="number"
                        placeholder="e.g., 5"
                        min="0"
                        step="0.01"
                        value={formData.target}
                        onChange={handleInputChange}
                        className={`mt-1 ${errors.target ? 'border-red-500' : ''}`}
                      />
                      {errors.target && (
                        <p className="text-red-500 text-sm mt-1">{errors.target}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="deadline">Campaign Deadline</Label>
                      <Input
                        id="deadline"
                        name="deadline"
                        type="date"
                        value={formData.deadline.toISOString().split('T')[0]}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className={`mt-1 ${errors.deadline ? 'border-red-500' : ''}`}
                      />
                      {errors.deadline && (
                        <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Campaign Image</Label>
                    <div className={`mt-1 ${errors.image ? 'border-red-500' : ''}`}>
                      <input
                        id="image"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                        <label htmlFor="image" className="cursor-pointer block p-4">
                          {formData.image ? (
                            <div className="space-y-2">
                              <div className="mx-auto w-40 h-40 overflow-hidden rounded-md">
                                <img
                                  src={URL.createObjectURL(formData.image)}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                {formData.image.name}
                              </p>
                              <p className="text-xs text-indigo-600">
                                Click to change image
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100">
                                <svg
                                  className="w-6 h-6 text-indigo-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <p className="mt-2 text-sm text-gray-600">
                                Click to upload a campaign image
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                JPG, PNG or GIF, max 5MB
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    {errors.image && (
                      <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Verification Documents</Label>
                    <div className="mt-1">
                      <FileUploader
                        id="documents"
                        label="Upload documents to verify your campaign"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple={true}
                        maxFiles={5}
                        maxSize={10}
                        files={formData.documents}
                        setFiles={handleDocumentsChange}
                        type="document"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Campaign Videos</Label>
                    <div className="mt-1">
                      <FileUploader
                        id="videos"
                        label="Upload videos about your campaign"
                        accept="video/*"
                        multiple={true}
                        maxFiles={2}
                        maxSize={50}
                        files={formData.videos}
                        setFiles={handleVideosChange}
                        type="video"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Campaign...
                        </>
                      ) : (
                        'Create Campaign'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCampaign;
