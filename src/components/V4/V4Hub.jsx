import React, { useState, useEffect } from 'react';
import V4Header from './V4Header';
import V4Hero from './V4Hero';
import V4VideoGrid from './V4VideoGrid';
import V4VideoModal from './V4VideoModal';
import V4Doctor3D from './V4Doctor3D';
import V4Downloads from './V4Downloads';
import V4StickySubscribe from './V4StickySubscribe';
import V4Footer from './V4Footer';
import CollaborationModal from '../CollaborationModal';
import { loadV4Videos } from '../../utils/loadV4Videos';

export default function V4Hub() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'doctor' | 'downloads'
  const [selectedVideoModal, setSelectedVideoModal] = useState(null);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);

  // SEO: Ensure /v4 is completely hidden from search engines (Noindex, Nofollow)
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
      created = true;
    }
    const previousContent = metaRobots.getAttribute('content');
    metaRobots.setAttribute('content', 'noindex, nofollow');

    const previousTitle = document.title;
    document.title = 'Capa Cero 3D - Videoteca & Recursos';

    return () => {
      if (created && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (previousContent) {
        metaRobots.setAttribute('content', previousContent);
      }
      document.title = previousTitle;
    };
  }, []);

  // Load videos directly from the secure official Google Sheet source
  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      const data = await loadV4Videos();
      setVideos(data || []);
      setIsLoading(false);
    };
    fetchVideos();
  }, []);

  // Find featured video (or first video)
  const featuredVideo = (videos || []).find((v) => v?.isFeatured) || (videos || [])[0] || null;

  const handleSearchWithQuery = (query) => {
    setActiveTab('videos');
    setActiveCategory('Todos');
    setSearchQuery(query);
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-[#2575c4] selection:text-white">
      
      {/* Header */}
      <V4Header
        onOpenTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 400, behavior: 'smooth' });
        }}
        activeTab={activeTab}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
      />

      {/* Hero */}
      <V4Hero
        featuredVideo={featuredVideo}
        onSelectVideo={(v) => setSelectedVideoModal(v)}
        onOpenTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 450, behavior: 'smooth' });
        }}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
      />

      {/* Main Content Area based on Tab */}
      <main className="flex-1">
        {isLoading ? (
          <div className="text-center py-24">
            <div className="inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-zinc-400">Cargando videoteca de Capa Cero...</p>
          </div>
        ) : (
          <>
            {activeTab === 'videos' && (
              <>
                <V4VideoGrid
                  videos={videos}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectVideo={(v) => setSelectedVideoModal(v)}
                />
                <V4Doctor3D
                  videos={videos}
                  onSelectVideo={(v) => setSelectedVideoModal(v)}
                  onSearchWithQuery={handleSearchWithQuery}
                />
              </>
            )}

            {activeTab === 'doctor' && (
              <V4Doctor3D
                videos={videos}
                onSelectVideo={(v) => setSelectedVideoModal(v)}
                onSearchWithQuery={handleSearchWithQuery}
              />
            )}

            {activeTab === 'downloads' && (
              <V4Downloads
                videos={videos}
                onSelectVideo={(v) => setSelectedVideoModal(v)}
              />
            )}
          </>
        )}
      </main>

      {/* Sticky Subscribe Bar on scroll */}
      <V4StickySubscribe onOpenCollaboration={() => setIsCollaborationOpen(true)} />

      {/* Footer */}
      <V4Footer onOpenCollaboration={() => setIsCollaborationOpen(true)} />

      {/* Video Modal */}
      {selectedVideoModal && (
        <V4VideoModal
          video={selectedVideoModal}
          onClose={() => setSelectedVideoModal(null)}
        />
      )}

      {/* Collaboration Modal from Main Site */}
      {isCollaborationOpen && (
        <CollaborationModal onClose={() => setIsCollaborationOpen(false)} />
      )}

    </div>
  );
}
