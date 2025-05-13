
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
import { uploadFileToStorage, uploadFilesToStorage } from '@/utils/ipfsUtils';
import { Loader2, Calendar, Target, Info, ImageIcon, FileText, Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Create form schema
const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long",
  }),
  description: z.string().min(20, {
    message: "Description must be at least 20 characters long",
  }),
  target: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Target amount must be greater than 0",
  }),
  deadline: z.date({
    required_error: "Deadline is required",
  }).refine(date => date > new Date(), {
    message: "Deadline must be in the future",
  }),
});

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { contract, address, isConnected, connectWallet } = useWeb3();
  const { toast } = useToast();
  
  const [image, setImage] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      target: "",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Image size must be less than 5MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setImageError("Only image files are allowed");
        return;
      }
      
      setImage(file);
      setImageError(null);
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    
    if (!image) {
      setImageError("Campaign image is required");
      toast({
        title: 'Missing Image',
        description: 'Please upload a campaign image',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Upload files
      toast({
        title: 'Uploading Files',
        description: 'Your files are being uploaded to storage...'
      });
      
      // Upload campaign image
      let imageUrl = '';
      try {
        console.log('Uploading image:', image.name);
        imageUrl = await uploadFileToStorage(image);
        console.log('Image uploaded successfully:', imageUrl);
      } catch (error: any) {
        console.error('Image upload error:', error);
        toast({
          title: 'Image Upload Failed',
          description: error.message || 'Failed to upload image',
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }
      
      // Upload documents
      let documentUrls: string[] = [];
      if (documents.length > 0) {
        try {
          console.log('Uploading documents:', documents.length);
          documentUrls = await uploadFilesToStorage(documents);
          console.log('Documents uploaded successfully:', documentUrls);
        } catch (error: any) {
          console.error('Documents upload error:', error);
          toast({
            title: 'Document Upload Warning',
            description: 'Some documents could not be uploaded, but we will continue with your campaign creation',
            variant: 'default'
          });
        }
      }
      
      // Upload videos
      let videoUrls: string[] = [];
      if (videos.length > 0) {
        try {
          console.log('Uploading videos:', videos.length);
          videoUrls = await uploadFilesToStorage(videos);
          console.log('Videos uploaded successfully:', videoUrls);
        } catch (error: any) {
          console.error('Videos upload error:', error);
          toast({
            title: 'Video Upload Warning',
            description: 'Some videos could not be uploaded, but we will continue with your campaign creation',
            variant: 'default'
          });
        }
      }

      // Get the user's ID from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.id;
      console.log('User ID:', userId);
      
      // Convert target amount to number
      const targetAmount = parseFloat(values.target);
      
      // Convert deadline to timestamp
      const deadlineTimestamp = values.deadline;
      
      console.log('Saving campaign to Supabase with data:', {
        creator_id: userId,
        title: values.title,
        description: values.description,
        target_amount: targetAmount,
        deadline: deadlineTimestamp.toISOString(),
        image_url: imageUrl,
        documents: documentUrls,
        videos: videoUrls
      });
      
      // Save campaign to Supabase
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          creator_id: userId,
          title: values.title,
          description: values.description,
          target_amount: targetAmount,
          deadline: deadlineTimestamp.toISOString(),
          image_url: imageUrl,
          documents: documentUrls,
          videos: videoUrls,
          is_verified: false,
          amount_collected: 0
        })
        .select()
        .single();
        const uuid = campaignData?.id; // UUID from Supabase
        const campaignIdBytes32 = uuidToBytes32(uuid);

        
      if (campaignError) {
        console.error('Supabase Error:', campaignError);
        throw new Error('Error saving campaign to database: ' + campaignError.message);
      }
      
      console.log('Campaign created in Supabase:', campaignData);
      
      // If contract is connected, also save to blockchain
      if (contract) {
        toast({
          title: 'Creating Campaign',
          description: 'Submitting campaign to the blockchain'
        });
        
        try {
          // Validate target
          if (isNaN(Number(values.target))) {
            throw new Error("Target must be a numeric value in ETH");
          }
        
          const targetInWei = ethers.utils.parseEther(values.target);
          const deadlineTimestamp = dateToTimestamp(values.deadline);
        
          const documentUrlsArray = Array.isArray(documentUrls) ? documentUrls : [documentUrls];
          const videoUrlsArray = Array.isArray(videoUrls) ? videoUrls : [videoUrls];
          console.log("imageUrl", imageUrl); // Should log a single string
          console.log("documentUrlsArray", documentUrlsArray); // Should be: ["url1", "url2"]
          console.log("videoUrlsArray", videoUrlsArray);       // Same here
          const singleImageUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;  // Get the first image URL if it's an array
          console.log("single ",singleImageUrl)

          const transaction = await contract.createCampaign(
            campaignIdBytes32,
            values.title,
            values.description,
            targetInWei,
            deadlineTimestamp,
            singleImageUrl, // not imageUrlArray
            documentUrlsArray,
            videoUrlsArray
          );
        
        
          
          // Wait for transaction to be mined
          await transaction.wait();
          console.log('Campaign created on blockchain');
        } catch (error: any) {
          console.error('Blockchain error:', error);
          // Continue anyway since we have the data in Supabase
          toast({
            title: 'Blockchain Warning',
            description: 'Campaign saved to database but blockchain transaction failed',
            variant: 'default'
          });
        }
      }
      
      toast({
        title: 'Campaign Created',
        description: 'Your campaign is now awaiting verification',
        variant: 'default'
      });
      
      // Navigate to home page to see the new campaign
      navigate('/');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'There was an error creating your campaign',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8dfec] to-[#c6afd0] dark:bg-gradient-to-br dark:from-[#1a1320] dark:to-[#131320]">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-primary hover:text-primary/80 mb-6"
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
          <Card className="border-border shadow-md bg-accent-50 text-text">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Create New Campaign</CardTitle>
              <CardDescription>
                Launch your crowdfunding campaign and share it with the world
              </CardDescription>
            </CardHeader>
            
            {!isConnected ? (
              <CardContent className="text-center py-8">
                <h2 className="text-xl font-medium mb-2">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-6">
                  You need to connect your wallet before creating a campaign
                </p>
                <Button 
                  onClick={connectWallet} 
                  className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
                >
                  Connect Wallet
                </Button>
              </CardContent>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Info className="h-4 w-4 mr-2 text-primary" />
                            Campaign Title
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter a catchy title for your campaign" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-primary" />
                            Campaign Description
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your campaign in detail" 
                              className="min-h-32" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Include your goals, what the funds will be used for, and your story
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Target className="h-4 w-4 mr-2 text-primary" />
                              Funding Target (ETH)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g., 5" 
                                min="0.01" 
                                step="0.01" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The amount of ETH you're aiming to raise
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-primary" />
                              Campaign Deadline
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When the campaign will end
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <Label className="flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                        Campaign Image
                      </Label>
                      <div className={`mt-1 ${imageError ? 'border-red-500' : ''}`}>
                        <input
                          id="image"
                          name="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="border border-dashed border-border rounded-lg p-4 text-center bg-secondary-100 hover:bg-muted/40 transition cursor-pointer">
                          <label htmlFor="image" className="cursor-pointer block p-4">
                            {image ? (
                              <div className="space-y-2">
                                <div className="mx-auto w-40 h-40 overflow-hidden rounded-md">
                                  <img
                                    src={URL.createObjectURL(image)}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {image.name}
                                </p>
                                <p className="text-xs text-primary">
                                  Click to change image
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                                  <ImageIcon className="h-6 w-6 text-primary" />
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Click to upload a campaign image
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  JPG, PNG or GIF, max 5MB
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      {imageError && (
                        <p className="text-red-500 text-sm mt-1">{imageError}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        Verification Documents
                      </Label>
                      <div className="mt-1 bg-secondary-100">
                        <FileUploader
                          id="documents"
                          label="Upload documents to verify your campaign"
                          accept=".pdf,.doc,.docx,.txt"
                          multiple={true}
                          maxFiles={5}
                          maxSize={10}
                          files={documents}
                          setFiles={setDocuments}
                          type="document"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="flex items-center">
                        <Film className="h-4 w-4 mr-2 text-primary" />
                        Campaign Videos
                      </Label>
                      <div className="mt-1 bg-secondary-100">
                        <FileUploader
                          id="videos"
                          label="Upload videos about your campaign"
                          accept="video/*"
                          multiple={true}
                          maxFiles={2}
                          maxSize={50}
                          files={videos}
                          setFiles={setVideos}
                          type="video"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary-400 to-primary-800 hover:from-primary-400 hover:to-primary-800 text-text"
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
                  </CardFooter>
                </form>
              </Form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateCampaign;
function uuidToBytes32(uuid: string): string {
  const cleanUuid = uuid.replace(/-/g, ''); // remove dashes
  const hexUuid = '0x' + cleanUuid;         // add 0x prefix
  return ethers.utils.hexZeroPad(hexUuid, 32);
}


