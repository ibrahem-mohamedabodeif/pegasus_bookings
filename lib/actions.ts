"use server";

import {  redirect } from "next/navigation";
import { createServerComponentClient } from "./server";
import { revalidatePath, revalidateTag } from "next/cache";



type bookingData = {
  roomId: string;
  startDay: string;
  endDay: string;
  nights: number;
  guests: number;
  totalPrice: number;
  serviceFee: number;
  cleaningFee: number
}
  const supabase = createServerComponentClient();

export async function createReservation(bookingData: bookingData, formData: FormData) {
  const { data: {user} } = await supabase.auth.getUser();

  const newBooking = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    number: Number(formData.get("number")),
    idNumber: Number(formData.get("idNumber")),
    notes: formData.get("notes"),
    roomId: bookingData.roomId,
    startDay: bookingData.startDay,
    endDay: bookingData.endDay,
    nights: Number(bookingData.nights),
    guests: Number(bookingData.guests),
    totalPrice: Math.ceil(
      Number(bookingData.totalPrice) +
        Number(bookingData.serviceFee) +
        Number(bookingData.cleaningFee)
    ),
    userId: user?.id ,
  };

  const { data, error } = await supabase
    .from("reservations")
    .insert([newBooking])
    .select();
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/account/reservations")
  redirect("/")
}

export async function signIn(previousState:any,formData: FormData) {

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
const searchParams = formData.get("searchParams") as string

  const { error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
   return error.message
  }

  const redirectUrl = searchParams.length
  ? `/reservation?${new URLSearchParams(searchParams).toString()}`
  : "/";
  
  redirect(redirectUrl);

}

export async function signUp( previousState:any,formData: FormData) {

  const email = formData.get("email") as string
  const password = formData.get("password") as string;
  const name = formData.get("fullName") as string
  const phone = formData.get("phoneNumber")
  const searchParams = formData.get("searchParams") as string

  
  const { error } = await supabase.auth.signUp({
    email: email,
    password: password, options: {
      data: {
        name: name,
        phone: phone
      }
    }
  });

  if (error) {
    return error.message
  }

  const redirectUrl = searchParams.length
    ? `/reservation?${new URLSearchParams(searchParams).toString()}`
    : "/";

  redirect(redirectUrl);
}

export async function signOut() {

  let { error } = await supabase.auth.signOut();

  revalidatePath("/")

  redirect("/");
}

export async function addRoom(formData: FormData) {
  const room: Record<string, any> = {
    userId:formData.get("userId"),
    hostedName: formData.get("hostedName"),
    country: formData.get("country"),
    city: formData.get("city"),
    place: formData.get("place"),
    roomName: formData.get("roomName"),
    category: formData.get("category"),
    description: formData.get("description"),
    guests: formData.get("guests"),
    price: formData.get("price"),
    noBath: formData.get("noBath"),
    noBed: formData.get("noBed"),
    noBedroom: formData.get("noBedroom"),
  };

  const uploadImage = async (imageFile: File | null, index: number) => {
    if (!imageFile) return null;

    const imageName = `${Math.random()}-${imageFile.name}`.replaceAll("/", "");
    const { data, error: storageError } = await supabase.storage
      .from("images") 
      .upload(imageName, imageFile);

    if (storageError) {
      throw new Error(`Failed to upload image ${index + 1}: ${storageError.message}`);
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("images") 
      .createSignedUrl(imageName, 60 * 60 * 24 * 365); 

    if (urlError) {
      throw new Error(`Failed to generate signed URL for image ${index + 1}: ${urlError.message}`);
    }

    return signedUrlData.signedUrl;
  };

  for (let i = 1; i <= 5; i++) {
    const imageKey = `image${i}`;
    const imageFile = formData.get(imageKey) as File;
    room[imageKey] = imageFile ? await uploadImage(imageFile, i) : null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert([room])
    .select();

  if (error) {
    throw new Error("Failed to insert room details: " + error.message);
  }
  redirect("/account/pegasus-rooms");
  return data;
}

export async function updateRoom(formData: FormData) {
  const roomId = formData.get("roomId") as string;
  
  // Fetch the existing room data
  const { data: existingRoom, error: fetchError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch room data: ${fetchError.message}`);
  }

  // Initialize the roomUpdates object
  const roomUpdates: Record<string, any> = {
    userId: formData.get("userId"),
    hostedName: formData.get("hostedName"),
    country: formData.get("country"),
    city: formData.get("city"),
    place: formData.get("place"),
    roomName: formData.get("roomName"),
    category: formData.get("category"),
    description: formData.get("description"),
    guests: formData.get("guests"),
    price: formData.get("price"),
    noBath: formData.get("noBath"),
    noBed: formData.get("noBed"),
    noBedroom: formData.get("noBedroom"),
  };

  // Function to upload images and get signed URLs
  const uploadImage = async (imageFile: File | null, index: number) => {
    if (!imageFile) return null;

    const imageName = `${Math.random()}-${imageFile.name}`.replace(/\//g, "-");
    const { data, error: storageError } = await supabase.storage
      .from("images")
      .upload(imageName, imageFile);

    if (storageError) {
      throw new Error(`Failed to upload image ${index + 1}: ${storageError.message}`);
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("images")
      .createSignedUrl(imageName, 60 * 60 * 24 * 365); // 1 year expiration

    if (urlError) {
      throw new Error(`Failed to generate signed URL for image ${index + 1}: ${urlError.message}`);
    }

    return signedUrlData.signedUrl;
  };

  // Process each image input
  for (let i = 1; i <= 5; i++) {
    const imageKey = `image${i}`;
    const imageFile = formData.get(imageKey) as File | null;
    
    // If a new image is provided, upload it and update the roomUpdates
    if (imageFile && imageFile.size > 0) {
      roomUpdates[imageKey] = await uploadImage(imageFile, i);
    } else if (existingRoom[imageKey]) {
      // If no new image is provided, retain the existing image URL
      roomUpdates[imageKey] = existingRoom[imageKey];
    }
  }

  // Update the room details in the database
  const { data, error } = await supabase
    .from("rooms")
    .update(roomUpdates)
    .eq("id", roomId)
    .select();

  if (error) {
    throw new Error("Failed to update room details: " + error.message);
  }
  redirect("/account/pegasus-rooms");
  return data;
}



