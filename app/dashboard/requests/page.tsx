import React from "react";
import OwnerRequests from "../OwnerRequests";

export default function page({ searchParams }: { searchParams?: { postId?: string } }) {
  const postId = searchParams?.postId || null;

  return (
    <div className="w-full h-full md:h-fit p-10 bg-[#ebf8fb] dark:bg-[#03070C] border border-gray-700/80 dark:border-gray-500/80 flex flex-col justify-start items-start gap-5 ">
      <h1 className=" text-lg md:text-2xl font-bold ">Check all the requests</h1>
      <OwnerRequests postId={postId} />
    </div>
  );
}
