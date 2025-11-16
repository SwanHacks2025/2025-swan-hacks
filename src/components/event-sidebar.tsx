"use client"

import { useEffect, useState } from "react";
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function EventSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, "Users", firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as { Username?: string };
        setUsername(data.Username || firebaseUser.displayName || "");
      } else {
        setUsername(firebaseUser.displayName || "");
      }

      setLoading(false);
    });

    return () => unsub();
  }, [])
  
  if (loading) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="text-base font-semibold">Loading...</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center">
              <Avatar className="size-20">
                {user?.photoURL && (
                  <AvatarImage src={user.photoURL} />
                )}
                <AvatarFallback>
                  {/* {avatarFallback} */}
                </AvatarFallback>
              </Avatar>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="text-center font-bold">{user?.displayName}</div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <span className="text-base font-semibold">Email:</span>
            <br />
            <span className="text-base font-normal">{user?.email}</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </Sidebar>
  )
}
