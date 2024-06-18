import React, { ReactText } from 'react'

function Layout({children}:{children:React.ReactNode}) {
  return (
    <div>
      <main className="root">
        <div className='root-container'>
            <div className='wrapper'>
            {children}

            </div>

        </div>
        
      
        </main>
    </div>
  )
}

export default Layout
