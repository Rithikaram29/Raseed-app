import { google } from 'googleapis';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

dotenv.config();

interface ServiceAccountCredentials {
    client_email: string;
    private_key: string;
    [key: string]: any;
}

interface ReceiptItem {
    item: string;
    price: number;
    rate: number;
    quantity: number;
    total: number;
}

interface ReceiptCategory {
    [categoryName: string]: ReceiptItem[];
}

interface ReceiptData {
    // categories: ReceiptCategory;
    // summary: {
    //     total_categories: number;
    //     total_items: number;
    //     total_amount: number;
    // };
    vendor: string,
    amount: number,
    totalItems: number,
    date: string,
    receiptId: string
}

class DiagnosticGoogleWalletManager {
    credentials: ServiceAccountCredentials;
    issuerId: string | undefined;
    authClient: any;
    walletobjects: any;

    constructor() {
        this.issuerId = process.env.WALLET_ISSUER_ID;
        if (!this.issuerId) {
            throw new Error('WALLET_ISSUER_ID not set in .env');
        }

        const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!keyFilePath) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS (path to key file) not set in .env');
        }

        try {
            const fileContent = fs.readFileSync(keyFilePath, 'utf8');
            this.credentials = JSON.parse(fileContent);
            console.log('✅ Credentials loaded for:', this.credentials.client_email);
        } catch (error: any) {
            throw new Error(`Failed to read or parse service account key file from ${keyFilePath}: ${error.message}`);
        }

        this.authClient = new google.auth.JWT({
            email: this.credentials.client_email,
            key: this.credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
        });

        this.walletobjects = google.walletobjects({
            version: 'v1',
            auth: this.authClient,
        });
    }

    // Validate service account and permissions
    async validateServiceAccount(): Promise<void> {
        try {
            console.log('\n🔍 Validating Service Account...');

            // Test authentication by making a simple API call
            const response = await this.walletobjects.genericclass.list({
                issuerId: this.issuerId
            });

            console.log('✅ Service account authentication successful');
            console.log(`📋 Found ${response.data.resources?.length || 0} existing classes`);

        } catch (error: any) {
            console.error('❌ Service account validation failed:', error.message);
            if (error.code === 403) {
                console.error('🚨 Permission denied - check if service account is authorized in Google Pay & Wallet Console');
            }
            throw error;
        }
    }

    async createReceiptClass(classSuffix: string): Promise<any> {
        const classId = `${this.issuerId}.${classSuffix}`;
        console.log(`\n📝 Creating Receipt Class: ${classId}`);

        try {
            const classData = {
                id: classId,
                issuerName: 'Digital Receipt Wallet',
                reviewStatus: 'UNDER_REVIEW'
            };

            console.log('Class data:', JSON.stringify(classData, null, 2));

            const response: any = await this.walletobjects.genericclass.insert({
                resource: classData,
            });
            console.log('✅ Receipt Class created successfully');
            return response.data;
        } catch (error: any) {
            if (error.code === 409) {
                console.log('ℹ️ Receipt Class already exists, fetching existing...');
                const response = await this.walletobjects.genericclass.get({ resourceId: classId });
                console.log('✅ Using existing Receipt Class');
                return response.data;
            } else {
                console.error('❌ Error creating Receipt Class:', error.response?.data || error.message);
                throw error;
            }
        }
    }

    async createReceiptObject(classSuffix: string, objectSuffix: string, receiptData: ReceiptData): Promise<any> {
        const classId = `${this.issuerId}.${classSuffix}`;
        const objectId = `${this.issuerId}.${objectSuffix}`;
        console.log(`\n📄 Creating Receipt Object: ${objectId}`);

        try {
            const objectData = {
                id: objectId,
                classId: classId,
                state: 'ACTIVE',
                genericType: 'GENERIC_RECEIPT',
                header: {
                    defaultValue: {
                        language: 'en-US',
                        value: 'Digital Receipt',
                    },
                },
                cardTitle: {
                    defaultValue: {
                        language: 'en-US',
                        value: `Total: ${Number(receiptData.amount || 0).toFixed(2) } items`,
                    },
                },
                subheader: {
                    defaultValue: {
                        language: 'en-US',
                        value: `${receiptData.totalItems} items • ${new Date().toLocaleDateString()}`,
                    },
                },
                textModulesData: [
                    {
                        header: 'Summary',
                        body: `Total: ${Number(receiptData.amount || 0).toFixed(2) } } CZK\nItems: ${receiptData.totalItems}\nDate: ${new Date().toLocaleDateString()}`,
                        id: 'summary'
                    }
                ],
                barcode: {
                    type: 'QR_CODE',
                    value: receiptData.receiptId,
                    alternateText: `Receipt ID: ${receiptData.receiptId}`
                },
                hexBackgroundColor: '#1f3a5f'
            };

            console.log('Object data:', JSON.stringify(objectData, null, 2));

            const response = await this.walletobjects.genericobject.insert({
                resource: objectData,
            });
            console.log('✅ Receipt Object created successfully');

            // Verify the object was created by fetching it back
            console.log('🔍 Verifying object creation...');
            const verifyResponse = await this.walletobjects.genericobject.get({ resourceId: objectId });
            console.log('✅ Object verification successful');

            return response.data;
        } catch (error: any) {
            if (error.code === 409) {
                console.log('ℹ️ Receipt Object already exists, using existing...');
                const response = await this.walletobjects.genericobject.get({ resourceId: objectId });
                console.log('✅ Using existing Receipt Object');
                return response.data;
            } else {
                console.error('❌ Error creating Receipt Object:', error);
                if (error.response?.data) {
                    console.error('API Response:', JSON.stringify(error.response.data, null, 2));
                }
                throw error;
            }
        }
    }

    validateJWTClaims(classSuffix: string, objectSuffix: string): any {
        const classId = `${this.issuerId}.${classSuffix}`;
        const objectId = `${this.issuerId}.${objectSuffix}`;

        const claims = {
            iss: this.credentials.client_email,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
            origins: ['http://localhost:3000', 'https://yourdomain.com'],
            payload: {
                genericObjects: [
                    {
                        id: objectId,
                        classId: classId,
                    },
                ],
            },
        };

        console.log('\n🔐 JWT Claims:', JSON.stringify(claims, null, 2));
        return claims;
    }

    generateSaveUrl(classSuffix: string, objectSuffix: string): string {
        const claims = this.validateJWTClaims(classSuffix, objectSuffix);

        console.log('\n🔐 Generating JWT token...');
        const token = jwt.sign(claims, this.credentials.private_key, { algorithm: 'RS256' });

        console.log('✅ JWT token generated');
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 50) + '...');

        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        // Save token to file for debugging
        fs.writeFileSync(`jwt_token_${objectSuffix}.txt`, token);
        console.log(`💾 JWT token saved to jwt_token_${objectSuffix}.txt`);

        return saveUrl;
    }

    // Test if objects exist and are accessible
    async verifyObjectsExist(classSuffix: string, objectSuffix: string): Promise<boolean> {
        const classId = `${this.issuerId}.${classSuffix}`;
        const objectId = `${this.issuerId}.${objectSuffix}`;

        console.log('\n🔍 Verifying objects exist...');

        try {
            // Check class
            await this.walletobjects.genericclass.get({ resourceId: classId });
            console.log('✅ Class exists and is accessible');

            // Check object
            await this.walletobjects.genericobject.get({ resourceId: objectId });
            console.log('✅ Object exists and is accessible');

            return true;
        } catch (error: any) {
            console.error('❌ Object verification failed:', error.message);
            return false;
        }
    }
}

// Comprehensive diagnostic function
export async function diagnosticCreateReceiptPass(receiptData: ReceiptData): Promise<string> {
    try {
        const walletManager = new DiagnosticGoogleWalletManager();
        console.log('\n🔧 DIAGNOSTIC MODE - Google Wallet Receipt Pass');
        console.log('================================================');

        const classSuffix = 'diagnostic_receipt_class';
        const objectSuffix = `diag_${Date.now()}_${uuidv4().replace(/-/g, '').substring(0, 8)}`;

        console.log(`\n📋 Configuration:`);
        console.log(`Issuer ID: ${walletManager.issuerId}`);
        console.log(`Class ID: ${walletManager.issuerId}.${classSuffix}`);
        console.log(`Object ID: ${walletManager.issuerId}.${objectSuffix}`);

        // Step 1: Validate service account
        await walletManager.validateServiceAccount();

        // Step 2: Create class
        await walletManager.createReceiptClass(classSuffix);

        // Step 3: Create object
        await walletManager.createReceiptObject(classSuffix, objectSuffix, receiptData);

        // Step 4: Verify objects exist
        const objectsExist = await walletManager.verifyObjectsExist(classSuffix, objectSuffix);
        if (!objectsExist) {
            throw new Error('Objects were not created successfully');
        }

        // Step 5: Generate save URL with detailed logging
        const saveUrl = walletManager.generateSaveUrl(classSuffix, objectSuffix);

        console.log('\n🎯 RESULTS');
        console.log('==========');
        console.log('✅ Service Account: Valid');
        console.log('✅ Class Creation: Success');
        console.log('✅ Object Creation: Success');
        console.log('✅ Object Verification: Success');
        console.log('✅ JWT Generation: Success');

        console.log('\n🔗 GOOGLE WALLET SAVE URL:');
        console.log(saveUrl);

        console.log('\n📋 TROUBLESHOOTING CHECKLIST:');
        console.log('1. ✅ Service account has wallet_object.issuer scope');
        console.log('2. ❓ Service account is authorized in Google Pay & Wallet Console');
        console.log('3. ❓ Issuer account is verified and approved');
        console.log('4. ❓ Testing with correct Google account (same as issuer)');
        console.log('5. ❓ Using supported browser/device');

        console.log('\n🚨 COMMON ISSUES:');
        console.log('- If URL shows "Something went wrong": Check issuer authorization');
        console.log('- If URL shows "Invalid token": Check JWT claims and private key');
        console.log('- If URL shows blank page: Try different browser or incognito mode');
        console.log('- If pass doesn\'t appear: Check Google account permissions');

        console.log('\n💡 NEXT STEPS:');
        console.log('1. Copy the save URL above');
        console.log('2. Open in browser (preferably Chrome)');
        console.log('3. Sign in with Google account');
        console.log('4. Click "Add to Google Wallet"');
        console.log('5. Check Google Wallet app');

        return saveUrl;
    } catch (error) {
        console.error('\n❌ DIAGNOSTIC FAILED:', error);
        throw error;
    }
}

// Test function
// export async function testDiagnosticPass(): Promise<string> {
//     const sampleData: ReceiptData = {
//         "categories": {
//             "Test Category": [
//                 {
//                     "item": "Test Item",
//                     "price": 10.00,
//                     "rate": 10.00,
//                     "quantity": 1,
//                     "total": 10.00
//                 }
//             ]
//         },
//         "summary": {
//             "total_categories": 1,
//             "total_items": 1,
//             "total_amount": 10.00
//         }
//     };

//     // return await diagnosticCreateReceiptPass(sampleData);
// }

export { DiagnosticGoogleWalletManager, ReceiptData };