import React from 'react';

export function PublicLeaderboard() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="relative">
        {/* Hero Section with Background Image */}
        <div 
          className="relative bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
          }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center text-white bg-gradient-to-b from-black/20 via-black/60 via-black/90 to-[#0A0A0A] pt-8 pb-16 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            Drop the World: Tomorrowland DJ Contest
          </h1>
        </div>
        
        {/* Content Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-300 mb-8">
            Public leaderboard content will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicLeaderboard;