
import React from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            About BlockFund
          </h1>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-gray-600 mb-6">
              BlockFund is a decentralized crowdfunding platform built on the Ethereum blockchain. 
              Our mission is to create a transparent, secure, and accessible fundraising ecosystem 
              where verified campaigners can raise funds for worthy causes, while donors can 
              contribute with confidence knowing their donations are going directly to legitimate campaigns.
            </p>
            
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-600 font-bold">1</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-lg">Campaign Creation</h3>
                  <p className="text-gray-600">
                    Verified creators can launch campaigns with detailed descriptions, funding goals, 
                    and supporting documents or videos to prove legitimacy.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-600 font-bold">2</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-lg">Verification Process</h3>
                  <p className="text-gray-600">
                    Campaigns and creators undergo a verification process to ensure legitimacy
                    and prevent fraudulent activities on the platform.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-600 font-bold">3</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-lg">Blockchain Donations</h3>
                  <p className="text-gray-600">
                    Donors can contribute ETH directly to campaigns through smart contracts, 
                    ensuring transparent and immutable transaction records.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-600 font-bold">4</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-lg">Fund Distribution</h3>
                  <p className="text-gray-600">
                    Campaign funds are transferred directly to the creator's wallet, eliminating 
                    middlemen and reducing fees associated with traditional crowdfunding.
                  </p>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Blockchain Technology</h2>
            <p className="text-gray-600 mb-6">
              BlockFund operates on the Holesky Ethereum testnet, leveraging blockchain technology 
              to ensure transparency, security, and immutability. All campaign data, including 
              documents and media files, are stored on IPFS (InterPlanetary File System) for 
              decentralized and persistent storage.
            </p>
            
            <h2 className="text-2xl font-bold mb-4">User Roles</h2>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Can Raise Campaigns
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Can Donate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification Required
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Admin</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes (Super verified)</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Verified User</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes (Manual/Auto KYC)</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">General User</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">No</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Yes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">No</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Explore Campaigns
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-100 py-8 border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">BlockFund - Decentralized Crowdfunding Platform</p>
          <p className="text-sm">Built with React, TypeScript, and Smart Contracts on Holesky Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
