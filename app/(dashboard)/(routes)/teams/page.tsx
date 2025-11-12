import React from 'react'
import PostsTab from './components/PostsTab';
import {FilterTab} from './components/FilterTab';
import CreateTeamDialog from './components/CreateTeamDialog';


const page = () => {
  return (
    <div className='min-h-screen text-black dark:bg-background bg-background dark:text-white  '>
      
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-2 w-full mt-10 pr-5  '>
        <FilterTab />
        <div className='col-span-3 px-5 lg:px-0 pt-4'>
          {/* <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Find Members</h2>
            <CreateTeamDialog />
          </div> */}
          <PostsTab />
        </div>
      </div>      
    </div>
  )
}

export default page
