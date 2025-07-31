interface ExtractedReceiptData {
    vendor: string;
    date: string;
    amount: string;
    category: string;
    items: string[];
    confidence: number;
  }
  
  export async function extractReceiptData(imageFile: File): Promise<ExtractedReceiptData> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      // Return dummy data when API key is not configured
      return simulateExtraction(imageFile);
    }
  
    try {
      // Convert image to base64
      const base64Image = await fileToBase64(imageFile);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Extract the following information from this receipt image and return it as JSON:
                {
                  "vendor": "store/restaurant name",
                  "date": "YYYY-MM-DD format",
                  "amount": "total amount as string",
                  "category": "suggested category (Groceries, Transport, Utilities, Entertainment, Food, Shopping, Healthcare, Other)",
                  "items": ["array of line items with prices"],
                  "confidence": "confidence score 0-1"
                }
                
                If any field cannot be determined, use empty string or empty array. Be as accurate as possible.`
              },
              {
                inline_data: {
                  mime_type: imageFile.type,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          }
        })
      });
  
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!extractedText) {
        throw new Error('No text extracted from API response');
      }
  
      // Parse the JSON response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
  
      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the extracted data
      return {
        vendor: extractedData.vendor || 'Unknown Vendor',
        date: extractedData.date || new Date().toISOString().split('T')[0],
        amount: extractedData.amount || '0.00',
        category: extractedData.category || 'Other',
        items: Array.isArray(extractedData.items) ? extractedData.items : [],
        confidence: extractedData.confidence || 0.5
      };
  
    } catch (error) {
      console.error('AI extraction failed:', error);
      // Fallback to simulation if API fails
      return simulateExtraction(imageFile);
    }
  }
  
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  function simulateExtraction(imageFile: File): Promise<ExtractedReceiptData> {
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        const dummyData: ExtractedReceiptData[] = [
          {
            vendor: 'Target Store #1234',
            date: new Date().toISOString().split('T')[0],
            amount: '89.42',
            category: 'Groceries',
            items: ['Milk - $3.99', 'Bread - $2.49', 'Eggs - $4.99', 'Apples - $5.99', 'Bananas - $2.99'],
            confidence: 0.85
          },
          {
            vendor: 'Shell Gas Station',
            date: new Date().toISOString().split('T')[0],
            amount: '45.20',
            category: 'Transport',
            items: ['Regular Gas - $45.20'],
            confidence: 0.92
          },
          {
            vendor: 'Starbucks Coffee',
            date: new Date().toISOString().split('T')[0],
            amount: '12.50',
            category: 'Food',
            items: ['Grande Latte - $5.25', 'Blueberry Muffin - $3.25', 'Tax - $0.75'],
            confidence: 0.88
          },
          {
            vendor: 'Amazon.com',
            date: new Date().toISOString().split('T')[0],
            amount: '67.89',
            category: 'Shopping',
            items: ['Wireless Mouse - $29.99', 'USB Cable - $12.99', 'Phone Case - $19.99', 'Shipping - $4.92'],
            confidence: 0.79
          }
        ];
  
        // Return a random dummy receipt
        const randomReceipt = dummyData[Math.floor(Math.random() * dummyData.length)];
        resolve(randomReceipt);
      }, 2000 + Math.random() * 1000); // 2-3 seconds simulation
    });
  }