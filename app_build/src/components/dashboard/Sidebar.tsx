import React from 'react';
import type { BrunoFolder } from '../../mocks/fakeData';

interface SidebarProps {
  folders: BrunoFolder[];
}

export function Sidebar({ folders }: SidebarProps) {
  const renderFolder = (folder: BrunoFolder, depth = 0) => {
    return (
      <div key={folder.id} className="flex flex-col">
        <div 
          className="flex items-center py-1.5 px-2 hover:bg-neutral-800 rounded-md cursor-pointer text-sm text-neutral-300 transition-colors"
          style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
        >
          <span className="mr-2 opacity-50">📁</span>
          {folder.name}
        </div>
        {folder.children && (
          <div className="flex flex-col">
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6 px-1">
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
          E
        </div>
        <h1 className="font-bold text-white tracking-tight">Echo</h1>
      </div>
      <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 px-1">Collections Bruno</h2>
      <div className="space-y-1">
        {folders.map(f => renderFolder(f))}
      </div>
    </div>
  );
}
