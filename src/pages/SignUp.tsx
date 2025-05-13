
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const SignUp = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details to get started with Kitloop</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">First name</label>
              <Input id="firstName" placeholder="Jane" />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" type="email" placeholder="hello@example.com" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" type="password" placeholder="Create a password" />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</label>
            <Input id="confirmPassword" type="password" placeholder="Confirm your password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button className="w-full bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
            Create Account
          </Button>
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-kitloop-accent hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
