/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { CreateUserParams, UpdateUserParams } from "@/types";

export async function POST(req: Request) {
  let debugInfo: any = {}; // Temporary debugging object

  console.log("Received a POST request for webhook");
  
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is not defined in the environment variables");
    return new Response("WEBHOOK_SECRET not defined", { status: 500 });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Add header details to debug info
  debugInfo.headers = { svix_id, svix_timestamp, svix_signature };

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers:", debugInfo.headers);
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  let payload;
  try {
    payload = await req.json();
    debugInfo.payload = payload; // Add payload to debug info
  } catch (err) {
    const error = err as Error;
    console.error("Error parsing JSON body:", error.message);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const body = JSON.stringify(payload);
  console.log("Received payload:", body);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    debugInfo.verifiedEvent = evt; // Add verified event to debug info
  } catch (err) {
    const error = err as Error;
    console.error("Error verifying webhook:", error.message);
    return new Response(`Verification error: ${error.message}`, { status: 400 });
  }

  console.log("Webhook verified:", evt);

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;
  debugInfo.eventType = eventType;

  try {
    // CREATE
    if (eventType === "user.created") {
      console.log("Creating user...");
      const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

      const user = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username!,
        firstName: first_name,
        lastName: last_name,
        photo: image_url,
      };

      const newUser = await createUser(user as CreateUserParams);
      console.log("User created:", newUser);

      // Set public metadata
      if (newUser) {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      }

      return NextResponse.json({ message: "OK", user: newUser });
    }

    // UPDATE
    if (eventType === "user.updated") {
      console.log("Updating user...");
      const { id, image_url, first_name, last_name, username } = evt.data;

      const user = {
        firstName: first_name,
        lastName: last_name,
        username: username!,
        photo: image_url,
      };

      const updatedUser = await updateUser(id, user as UpdateUserParams);
      console.log("User updated:", updatedUser);

      return NextResponse.json({ message: "OK", user: updatedUser });
    }

    // DELETE
    if (eventType === "user.deleted") {
      console.log("Deleting user...");
      const { id } = evt.data;

      const deletedUser = await deleteUser(id!);
      console.log("User deleted:", deletedUser);

      return NextResponse.json({ message: "OK", user: deletedUser });
    }
  } catch (err) {
    const error = err as Error;
    console.error("Error handling webhook event:", error.message);
    debugInfo.error = error.message;
    return new Response(`Error occurred while processing webhook: ${error.message}`, {
      status: 500,
    });
  }

  console.log(`Unhandled webhook with ID: ${id} and type: ${eventType}`);
  console.log("Webhook body:", body);

  return new Response(JSON.stringify(debugInfo), { status: 200 });
}
