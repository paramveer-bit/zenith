// import { PrismaClient, Prisma } from '@prisma/client';

// const prisma = new PrismaClient();

// // --- Configuration ---
// // This ID must exist in the 'Request' table to satisfy the foreign key constraint.
// const REQUEST_ID_TO_LINK = 'cm806g4ja0000umfofa4itlah';
// const NUMBER_OF_ENTRIES = 250;
// const DAYS_TO_COVER = 30;

// // --- Data Pools (No Faker.js) ---

// const REQUEST_URLS = [
//     '/api/v1/user/auth/isSignedIn',
//     '/api/v1/user/auth/signIn',
//     '/api/v1/user/auth/signup',
//     '/api/v1/user/auth/verifyUser',
//     '/api/v1/user/auth/resendOtp',
//     '/api/v1/user/auth/signout',
//     '/api/v1/user/profile',
//     '/api/v1/gym/[gymId]',
//     '/api/v1/gym/[gymId]/images',
//     '/api/v1/gym/[gymId]/addImage',
//     '/api/v1/gyms/search',
//     '/api/v1/bookings',
//     '/api/v1/plans',
//     '/api/v1/notifications',
// ];
// const FORWARD_BASE_URL = 'https://back.fitnearby.com';
// const SUCCESS_STATUS_CODES = [200, 201, 202, 204];
// const ERROR_STATUS_CODES = [400, 401, 403, 404, 500, 503];
// const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
// const BROWSER_AGENTS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Mobile App'];
// const OS_TYPES = ['Windows', 'macOS', 'Android', 'iOS', 'Linux'];

// // --- Utility Functions ---

// function getRandomElement<T>(arr: T[]): T {
//     return arr[Math.floor(Math.random() * arr.length)];
// }

// function getRandomInt(min: number, max: number): number {
//     min = Math.ceil(min);
//     max = Math.floor(max);
//     return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function generateAlphanumeric(length: number): string {
//     let result = '';
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     for (let i = 0; i < length; i++) {
//         result += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return result;
// }

// function generateIpAddress(): string {
//     return Array(4).fill(0).map(() => getRandomInt(0, 255)).join('.');
// }

// function getDateWithinLastDays(daysAgo: number): Date {
//     const now = new Date();
//     const startTimestamp = now.getTime() - (daysAgo * 24 * 60 * 60 * 1000);
//     const randomTimestamp = getRandomInt(startTimestamp, now.getTime());
//     return new Date(randomTimestamp);
// }

// /**
//  * Generates a single synthetic RequestLog entry.
//  */
// function generateRequestLogEntry(): Prisma.RequestLogCreateInput {
//     const requestUrl = getRandomElement(REQUEST_URLS);
//     const forwardUrl = `${FORWARD_BASE_URL}${requestUrl}`;
//     const isError = Math.random() < 0.15;

//     const statusCode = isError
//         ? getRandomElement(ERROR_STATUS_CODES)
//         : getRandomElement(SUCCESS_STATUS_CODES);

//     const createdAt = getDateWithinLastDays(DAYS_TO_COVER);
//     const duration = isError
//         ? getRandomInt(500, 5000)
//         : getRandomInt(10, 800);

//     return {
//         // FIX: Using the primitive foreign key 'requestId' for createMany
//         requestId: REQUEST_ID_TO_LINK,

//         requestUrl: requestUrl,
//         forwardUrl: forwardUrl,
//         // FIX: Using 'as Prisma.InputJsonValue' to satisfy JSON input type
//         response: {
//             status: statusCode >= 400 ? 'error' : 'success',
//             message: statusCode >= 400 ? 'Client Error' : 'OK',
//             data: null
//         } as Prisma.InputJsonValue,

//         statusCode: statusCode,
//         type: getRandomElement(HTTP_METHODS),
//         comment: isError ? `Request failed with status ${statusCode} for ${requestUrl}` : null,
//         duration: duration,
//         userId: generateAlphanumeric(24),
//         browser: getRandomElement(BROWSER_AGENTS),
//         os: getRandomElement(OS_TYPES),
//         ip: generateIpAddress(),
//         createdAt: createdAt,
//         updatedAt: new Date(createdAt.getTime() + getRandomInt(100, 1000)),
//     };
// }

// // --- Parent Request Utility Function ---

// /**
//  * Checks for and creates the parent Request record if it doesn't exist.
//  * THIS IS REQUIRED TO PREVENT THE FOREIGN KEY VIOLATION (P2003).
//  */
// async function ensureParentRequestExists() {
//     const existingRequest = await prisma.request.findUnique({
//         where: { id: REQUEST_ID_TO_LINK },
//     });

//     if (!existingRequest) {
//         console.log(`\n⚠️ Parent Request '${REQUEST_ID_TO_LINK}' not found. Creating it now...`);

//         // --- IMPORTANT: FILL IN REQUIRED FIELDS HERE ---
//         // You MUST provide any non-optional fields required by your actual 'Request' model.
//         const requestData: Prisma.RequestCreateInput = {
//             id: REQUEST_ID_TO_LINK,
//             // If 'Request' has other REQUIRED fields (e.g., name, method, etc.), add them here.
//             // Example: name: 'Authentication API',
//             // Example: method: 'POST',
//         };
//         // ----------------------------------------------

//         const newRequest = await prisma.request.create({
//             data: requestData,
//         });
//         console.log(`✅ Created parent Request with ID: ${newRequest.id}`);
//     } else {
//         console.log(`✅ Parent Request '${REQUEST_ID_TO_LINK}' already exists.`);
//     }
// }

// // --- Main Seeding Function ---

// async function seedRequestLogs() {
//     console.log(`\n🚀 Starting database seeding for RequestLog...`);

//     // 1. Ensure the parent record exists (The fix for P2003)
//     await ensureParentRequestExists();

//     console.log(`Target: ${NUMBER_OF_ENTRIES} entries over the last ${DAYS_TO_COVER} days.`);

//     // 2. Generate all the data
//     const logEntries: Prisma.RequestLogCreateInput[] = [];
//     for (let i = 0; i < NUMBER_OF_ENTRIES; i++) {
//         logEntries.push(generateRequestLogEntry());
//     }

//     console.log(`✅ Generated ${NUMBER_OF_ENTRIES} synthetic log entries.`);

//     // Sort by createdAt for chronological insertion (optional)
//     logEntries.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

//     // 3. Insert data in batches for efficiency
//     const batchSize = 50;
//     for (let i = 0; i < logEntries.length; i += batchSize) {
//         const batch = logEntries.slice(i, i + batchSize);

//         await prisma.requestLog.createMany({
//             data: batch,
//             skipDuplicates: true,
//         });

//         console.log(`   ...inserted batch ${Math.ceil((i + batchSize) / batchSize)} / ${Math.ceil(NUMBER_OF_ENTRIES / batchSize)}`);
//     }

//     console.log(`\n🎉 Successfully inserted ${NUMBER_OF_ENTRIES} RequestLog entries into the database.`);
// }

// // --- Execute and Handle Errors ---
// seedRequestLogs()
//     .catch((e) => {
//         console.error(`\n❌ Seeding failed:`, e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });