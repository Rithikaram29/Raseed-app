import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, Camera, FileText, X, Check, AlertCircle, Edit } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useUploadReceipt } from '@/hooks/receipts';
import { useUserStore } from '@/store/useUserStore';
import { useSaveReceipt } from '@/hooks/receipts/useSaveReceipts';
import { Wallet, ExternalLink } from 'lucide-react';

export default function UploadReceipt() {
  const [uploadStep, setUploadStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState({
    vendor: '',
    date: '',
    amount: '',
    category: '',
    items: [] as { name: string; price: number; quantity?: number }[],
    notes: '',
    confidence: 0,
  });

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [googleWalletUrl, setGoogleWalletUrl] = useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    name: string;
    price: number;
    quantity?: number;
    index: number;
  } | null>(null);

  const { mutate: uploadReceipt, isError, error } = useUploadReceipt();
  const { mutate: saveReceipt, isPending } = useSaveReceipt();

  const user = useUserStore(state => state.user);
  const userId = user?.email as string;

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadStep('processing');

    // Optional: fake progress (UI-only)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) clearInterval(interval);
    }, 100);

    uploadReceipt(
      { file, userId },
      {
        onSuccess: response => {
          const { categorization, confidence = 0.9 } = response;

          const items = categorization.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
          }));

          setExtractedData({
            vendor: categorization.receipt.name || '',
            date: new Date().toISOString().split('T')[0],
            amount: categorization.receipt.total_price,
            category: 'Other',
            items,
            notes: '',
            confidence,
          });

          setUploadStep('review');
        },
        onError: error => {
          console.error('Extraction failed:', error);
          setExtractedData({
            vendor: '',
            date: new Date().toISOString().split('T')[0],
            amount: '',
            category: '',
            items: [],
            notes: '',
            confidence: 0,
          });
          setUploadStep('review');
        },
      }
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      mp4: ['.mp4'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });
  const handleSubmit = () => {
    const payload = {
      userId,
      editedCategorization: {
        ...extractedData,
      },
    };

    saveReceipt(payload, {
      onSuccess: (data) => {

        const walletUrl = data?.passUrl || '';
        console.log('Google Wallet URL:', walletUrl);
        setGoogleWalletUrl(walletUrl);

        // Show success modal instead of alert
        setIsSuccessModalOpen(true);
        setUploadStep('upload');
        setUploadedFile(null);
        setUploadProgress(0);
        setExtractedData({
          vendor: '',
          date: '',
          amount: '',
          category: '',
          items: [],
          notes: '',
          confidence: 0,
        });
      },
      onError: error => {
        console.error('Save failed', error);
        alert('Failed to save receipt. Please try again.');
      },
    });
  };

  const handleCancel = () => {
    setUploadStep('upload');
    setUploadedFile(null);
    setUploadProgress(0);
  };

  const handleDeleteItem = (index: number) => {
    setExtractedData(prevData => {
      const newItems = prevData.items.filter((_, i) => i !== index);
      const newTotal = newItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
      return { ...prevData, items: newItems, amount: newTotal.toFixed(2) };
    });
  };

  const handleEditItem = (index: number) => {
    setEditingItem({ ...extractedData.items[index], index });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedItem = () => {
    if (editingItem) {
      setExtractedData(prevData => {
        const newItems = [...prevData.items];
        newItems[editingItem.index] = {
          name: editingItem.name,
          price: editingItem.price,
          quantity: editingItem.quantity,
        };
        const newTotal = newItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        return { ...prevData, items: newItems, amount: newTotal.toFixed(2) };
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    }
  };

  return (
    <div className=" bg-background safe-area-inset">
      <main className="fade-in-slide-up">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Upload Receipt</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Upload your receipt and let AI extract the details automatically
            </p>
          </div>

          {/* Upload Step */}
          {uploadStep === 'upload' && (
            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Receipt
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors touch-manipulation ${isDragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                    }`}
                >
                  <input {...getInputProps()} />
                  <div className="mb-4">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                      {isDragActive ? 'Drop your receipt here' : 'Drag & drop your receipt'}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Support for JPEG, PNG, and PDF files up to 10MB
                    </p>
                  </div>
                  <Button variant="outline" className="mb-4 h-12 px-6">
                    Browse Files
                  </Button>
                  <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-gray-500">
                    <span>Or</span>
                  </div>
                  <Button variant="outline" className="mt-4 h-12 px-6" disabled>
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Take Photo (Mobile)</span>
                    <span className="sm:hidden">Take Photo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Step */}
          {uploadStep === 'processing' && (
            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Processing Receipt
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="text-center py-6 sm:py-8">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                      Extracting Receipt Data
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground px-4">
                      Using AI to read and extract information from your receipt...
                    </p>
                  </div>

                  <div className="max-w-xs sm:max-w-md mx-auto">
                    <Progress value={uploadProgress} className="mb-4" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {uploadProgress < 50
                        ? 'Scanning receipt...'
                        : uploadProgress < 80
                          ? 'Extracting data...'
                          : 'Finalizing...'}
                    </p>
                  </div>

                  <Button variant="outline" onClick={handleCancel} className="mt-6 h-12 px-6">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Step */}
          {uploadStep === 'review' && (
            <div className="space-y-4 sm:space-y-6">
              <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 flex-wrap">
                    <Check className="h-5 w-5 text-green-600" />
                    <span>Review Extracted Data</span>
                    {extractedData.confidence > 0 && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full mt-1 sm:mt-0 ${extractedData.confidence > 0.8
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : extractedData.confidence > 0.6
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                      >
                        {Math.round(extractedData.confidence * 100)}% confidence
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label htmlFor="vendor" className="text-sm font-medium text-foreground">
                        Vendor Name
                      </Label>
                      <Input
                        id="vendor"
                        value={extractedData.vendor}
                        onChange={e =>
                          setExtractedData({
                            ...extractedData,
                            vendor: e.target.value,
                          })
                        }
                        className="mt-1 h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="date" className="text-sm font-medium text-foreground">
                        Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={extractedData.date}
                        onChange={e =>
                          setExtractedData({
                            ...extractedData,
                            date: e.target.value,
                          })
                        }
                        className="mt-1 h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                        Total Amount
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={extractedData.amount}
                        onChange={e =>
                          setExtractedData({
                            ...extractedData,
                            amount: e.target.value,
                          })
                        }
                        className="mt-1 h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-sm font-medium text-foreground">
                        Category
                      </Label>
                      <Select
                        value={extractedData.category}
                        onValueChange={value =>
                          setExtractedData({
                            ...extractedData,
                            category: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1 h-12">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Groceries">Groceries</SelectItem>
                          <SelectItem value="Transport">Transport</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Food">Food & Dining</SelectItem>
                          <SelectItem value="Shopping">Shopping</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Label htmlFor="notes" className="text-sm font-medium text-foreground">
                      Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={extractedData.notes}
                      onChange={e =>
                        setExtractedData({
                          ...extractedData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Add any additional notes about this receipt..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Extracted Items */}
              {extractedData.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                      Extracted Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-2">
                      {extractedData.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg touch-manipulation"
                        >
                          <span className="text-foreground text-sm sm:text-base flex-1 mr-2">
                            {item.name} - ₹{item.price}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => handleEditItem(index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => handleDeleteItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end pt-4">
                <Button variant="outline" onClick={handleCancel} className="h-12">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-primary hover:bg-primary-foreground h-12"
                >
                  {isPending ? 'Saving...' : 'Save Receipt'}
                </Button>
              </div>

              {/* Edit Item Modal */}
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>
                      Make changes to the item here. Click save when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="itemName" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="itemName"
                        value={editingItem?.name || ''}
                        onChange={e =>
                          setEditingItem(prev => (prev ? { ...prev, name: e.target.value } : null))
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="itemPrice" className="text-right">
                        Price
                      </Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        value={editingItem?.price || 0}
                        onChange={e => {
                          const value = e.target.value;
                          setEditingItem(prev => {
                            if (!prev) return null;
                            // If the value is '0' and a new digit is typed, replace '0'
                            const newValue = value === '0' && e.nativeEvent instanceof InputEvent && /^[0-9]$/.test(e.nativeEvent.data || '')
                              ? e.nativeEvent.data || ''
                              : value;
                            const parsedValue = parseFloat(newValue);
                            return { ...prev, price: isNaN(parsedValue) ? 0 : parsedValue };
                          });
                        }}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="itemQuantity" className="text-right">
                        Quantity
                      </Label>
                      <Input
                        id="itemQuantity"
                        type="number"
                        value={editingItem?.quantity || 0}
                        onChange={e => {
                          const value = e.target.value;
                          setEditingItem(prev => {
                            if (!prev) return null;
                            // If the value is '0' and a new digit is typed, replace '0'
                            const newValue = value === '0' && e.nativeEvent instanceof InputEvent && /^[0-9]$/.test(e.nativeEvent.data || '')
                              ? e.nativeEvent.data || ''
                              : value;
                            const parsedValue = parseFloat(newValue);
                            return { ...prev, quantity: isNaN(parsedValue) ? 0 : parsedValue };
                          });
                        }}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSaveEditedItem}>
                      Save changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Success Modal with Google Wallet Integration */}
              <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
                <DialogContent className="sm:max-w-[500px] text-center">
                  <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      Receipt Saved Successfully! 🎉
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground mt-2">
                      Your receipt has been processed and saved to your account.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-6">


                    {googleWalletUrl && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center mb-3">
                          <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                            Add to Google Wallet
                          </h3>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                          Save this receipt to your Google Wallet for easy access and organization
                        </p>
                        <Button
                          onClick={() => {
                            window.open(googleWalletUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          <Wallet className="h-5 w-5 mr-2" />
                          Add to Google Wallet
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="flex justify-center">
                    <Button
                      onClick={() => setIsSuccessModalOpen(false)}
                      variant="outline"
                      className="px-8 py-2 font-medium"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
