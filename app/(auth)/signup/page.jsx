'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import axios from "axios";

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string()
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
)

export default function Signup() {

    const router = useRouter();
    const [serverError, setServerError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { data: session, status } = useSession();

    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema) });
   
    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading" || status === "authenticated") return null;

    const onSubmit = async (data) => {
        setIsLoading(true);
        setServerError("");

        try {
            await axios.post("/api/auth/signup", {
                name: data.name,
                email: data.email,
                password: data.password,
            })
            router.push("/signin");
        } catch (error) {
            setServerError(error.response?.data?.error || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                    <p className="text-gray-500 mt-1 text-sm">Start managing your client projects</p>
                </div>

                {/* Show server-side errors here */}
                {serverError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
                        {serverError}
                    </div>
                )}

                {/* handleSubmit runs Zod validation, then calls onSubmit */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                        </label>
                        {/* register('name') connects this input to the form */}
                        <input
                            {...register('name')}
                            type="text"
                            placeholder="John Doe"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {/* errors.name exists only when validation fails */}
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            {...register('email')}
                            type="email"
                            placeholder="you@example.com"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            {...register('password')}
                            type="password"
                            placeholder="Min 8 characters"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <input
                            {...register('confirmPassword')}
                            type="password"
                            placeholder="Repeat your password"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
                    >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </button>

                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link href="/signin" className="text-blue-600 hover:underline font-medium">
                        Log in
                    </Link>
                </p>

            </div>
        </div>
    )
};