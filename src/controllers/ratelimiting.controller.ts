import asyncHandler from "../helpers/asynchandeler";
import ApiError from "../helpers/ApiError";
import ApiResponse from "../helpers/ApiResponse";
import { Request, Response } from "express";
import PrismaClient from "../prismaClient/index"
import { z } from "zod"


const addUserRateLimiting = asyncHandler(async (req: Request, res: Response) => {

    const { requestId, rateLimiting, user_code } = req.body
    if (!requestId || !rateLimiting || !user_code) throw new ApiError(400, "Bad Request")

    const result = PrismaClient.rateLimiting.create({
        data: {
            requestId,
            rate: rateLimiting,
            user_code
        }
    })

    if (!result) throw new ApiError(500, "Internal Server Error")

    const response = new ApiResponse("200", "Rate Limiting Added Successfully", JSON.stringify(result))

    res.status(200).json(response)
})

const getUserRateLimiting = asyncHandler(async (req: Request, res: Response) => {

    const { user_code } = req.body
    if (!user_code) throw new ApiError(400, "Bad Request")

    const result = PrismaClient.rateLimiting.findMany({
        where: {
            user_code
        }
    })

    if (!result) throw new ApiError(500, "Internal Server Error")

    const response = new ApiResponse("200", "Rate Limiting Added Successfully", JSON.stringify(result))

    res.status(200).json(response)
})

const modifyUserRateLimiting = asyncHandler(async (req: Request, res: Response) => {

    const { id, newRate } = req.body
    if (!id || !newRate) throw new ApiError(400, "Bad Request")

    const result = PrismaClient.rateLimiting.update({
        where: {
            id
        },
        data: {
            rate: newRate
        }
    })

    if (!result) throw new ApiError(500, "Internal Server Error")

    const response = new ApiResponse("200", "Rate Limiting Modified Successfully", JSON.stringify(result))

    res.status(200).json(response)
})

const deleteUserRateLimiting = asyncHandler(async (req: Request, res: Response) => {

    const { id } = req.body
    if (!id) throw new ApiError(400, "Bad Request")

    const result = PrismaClient.rateLimiting.delete({
        where: {
            id
        }
    })

    if (!result) throw new ApiError(500, "Internal Server Error")

    const response = new ApiResponse("200", "Rate Limiting Deleted Successfully", JSON.stringify(result))

    res.status(200).json(response)
})

const getUserFile = asyncHandler(async (req: Request, res: Response) => {

    const { id, data_json } = req.body
    const user_id = req.user_id

    if (!user_id) throw new ApiError(400, "Invalid User")

    const result = PrismaClient.request.findUnique({
        where: {
            id,
            ownerId: user_id
        }
    })
    console.log(id, data_json, user_id)

    if (!result) throw new ApiError(500, "Invalid request id")

    let count = 0;
    const parsedData = JSON.parse(data_json);  // Parse the JSON string into an object
    console.log(parsedData[0])
    if (Array.isArray(parsedData)) {
        for (let i = 0; i < parsedData.length; i++) {
            const data = parsedData[i]
            if (!data.ip || !data.rate || !data.user_code) return;  // Skip invalid data

            try {
                const result = await PrismaClient.rateLimiting.create({
                    data: {
                        requestId: id, // Ensure `id` is available in the correct scope
                        rate: data.rate,
                        user_code: data.user_code,
                        ip: data.ip
                    }
                });
            } catch (error) {
                console.log('Error:', error);
                count++;  // Increment error count
            }
        }
    } else {
        console.error('data_json is not an array');
    }


    console.log(count)
    if (count !== 0) {
        const result = new ApiResponse("501", null, `Error in adding ${count} users`)
        return res.status(501).json(result)
    }
    const result2 = new ApiResponse("200", "Rate Limiting Added Successfully", JSON.stringify(result))
    return res.status(200).json(result2);



})

export {
    addUserRateLimiting,
    getUserRateLimiting,
    modifyUserRateLimiting,
    deleteUserRateLimiting,
    getUserFile
}