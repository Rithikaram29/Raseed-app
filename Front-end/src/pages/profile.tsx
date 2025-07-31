'use client';

import { useRouter } from 'next/router';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Mail, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/useUserStore';
import LogoutButton from '@/components/ui/logout';

export default function MyProfilePage() {
  const { clearUser } = useUserStore();
  const router = useRouter();
  const user = useUserStore(state => state.user);

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-lg bg-card text-foreground">
          <CardHeader className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user?.image ?? ''} alt={user?.name ?? 'User'} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {user?.name ?? 'Unknown User'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground text-sm">{user?.name}</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground text-sm">{user?.email}</span>
              </div>
            </div>

            <Separator />

            <LogoutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
