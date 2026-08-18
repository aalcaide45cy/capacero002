import React, { useState, useEffect, useMemo } from 'react';
import V4Hero from './V4Hero';
import V4SearchBar from './V4SearchBar';
import V4VideoGrid from './V4VideoGrid';
import V4VideoModal from './V4VideoModal';
import V4Doctor3D from './V4Doctor3D';
import V4Downloads from './V4Downloads';
import V4StickySubscribe from './V4StickySubscribe';
import V4Footer from './V4Footer';
import V4CircuitBackground from './V4CircuitBackground';
import CollaborationModal from '../CollaborationModal';
import { loadV4Videos, getInitialV4Videos } from '../../utils/loadV4Videos';
import { initAnalyticsSession, setActiveSection } from '../../utils/analytics';

export default function V4Hub() {
  // Inicialización síncrona instantánea: 0ms de espera para Googlebot y visitantes
  const [videos, setVideos] = useState(() => getInitialV4Videos());
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'doctor' | 'downloads'
  const [selectedVideoModal, setSelectedVideoModal] = useState(null);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Iniciar sesión de analítica completa en el montaje
  useEffect(() => {
    initAnalyticsSession();
  }, []);

  // Actualizar la sección activa según la pestaña actual
  useEffect(() => {
    if (activeTab === 'videos') setActiveSection('Videoteca Grid');
    else if (activeTab === 'doctor') setActiveSection('Doctor 3D');
    else if (activeTab === 'downloads') setActiveSection('Descargas');
  }, [activeTab]);

  // Scroll listener optimizado con requestAnimationFrame
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          if (scrollY > 240) {
            setIsSticky(true);
          } else if (scrollY < 180) {
            setIsSticky(false);
            setActiveSection('Hero Principal');
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // SEO: Ensure proper title and indexation
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }
  }, []);

  // Sincronización en segundo plano con caché diario (SWR)
  useEffect(() => {
    let isMounted = true;
    loadV4Videos().then((freshData) => {
      if (isMounted && Array.isArray(freshData) && freshData.length > 0) {
        setVideos(freshData);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // El vídeo en Hero es siempre el último que se ha publicado (no programado)
  const featuredVideo = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    return videos.find((v) => !v.isScheduled) || videos[0];
  }, [videos]);

  const handleSearchWithQuery = (query) => {
    setActiveTab('videos');
    setActiveCategory('Todos');
    setSearchQuery(query);
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val && val.trim().length > 0 && activeTab !== 'videos') {
      setActiveTab('videos');
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-[#2575c4] selection:text-white">
      
      {/* Fondo Decorativo Tecnológico con Pistas de Circuito y Pulsos de Energía */}
      <V4CircuitBackground />

      {/* Hero with Centered Logo, Socials, Colaboraciones, and Integrated SearchBar */}
      <V4Hero
        featuredVideo={featuredVideo}
        isSearching={isSearching}
        onSelectVideo={(v) => setSelectedVideoModal(v)}
        onOpenTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 450, behavior: 'smooth' });
        }}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
      >
        <V4SearchBar
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isSticky={isSticky}
          onOpenCollaboration={() => setIsCollaborationOpen(true)}
        />
      </V4Hero>

      {/* Main Content Area based on Tab */}
      <main className="flex-1">
        {activeTab === 'videos' && (
          <V4VideoGrid
            videos={videos}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSelectVideo={(v) => setSelectedVideoModal(v)}
          />
        )}

        {activeTab === 'downloads' && (
          <V4Downloads
            videos={videos}
            onSelectVideo={(v) => setSelectedVideoModal(v)}
          />
        )}
      </main>

      {/* Sticky Subscribe Bar on scroll */}
      <V4StickySubscribe
        isSticky={isSticky}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
      />

      {/* Footer */}
      <V4Footer onOpenCollaboration={() => setIsCollaborationOpen(true)} />

      {/* Video Modal */}
      {selectedVideoModal && (
        <V4VideoModal
          video={selectedVideoModal}
          allVideos={videos}
          onSelectVideo={(v) => setSelectedVideoModal(v)}
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
