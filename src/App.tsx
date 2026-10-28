import React, { useState } from 'react';
import {
  Company,
  Department,
  Contact,
  Card,
  MergeQueueItem,
  OfflineQueueItem,
} from './types';
import {
  INITIAL_COMPANIES,
  INITIAL_DEPARTMENTS,
  INITIAL_CONTACTS,
  INITIAL_CARDS,
  INITIAL_MERGE_QUEUE,
  INITIAL_OFFLINE_QUEUE,
} from './data/syntheticData';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CardsDirectory } from './components/CardsDirectory';
import { ScannerModal } from './components/ScannerModal';
import { MergeQueueView } from './components/MergeQueueView';
import { HybridSearchView } from './components/HybridSearchView';
import { VerificationTestbench } from './components/VerificationTestbench';
import { ExportManagementView } from './components/ExportManagementView';
import { CardDetailModal } from './components/CardDetailModal';
import { normalizeCompanyName, inferTitleRank } from './utils/entityResolution';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'directory' | 'scanner' | 'search' | 'merge_queue' | 'verification' | 'export'
  >('directory');

  // Core state from synthetic data
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [mergeQueue, setMergeQueue] = useState<MergeQueueItem[]>(INITIAL_MERGE_QUEUE);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(INITIAL_OFFLINE_QUEUE);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected card modal state
  const [selectedCardState, setSelectedCardState] = useState<{
    card: Card;
    contact: Contact;
    company: Company;
  } | null>(null);

  // Handlers
  const handleSelectCard = (card: Card, contact: Contact, company: Company) => {
    setSelectedCardState({ card, contact, company });
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updatedContact.id ? updatedContact : c)));
  };

  const handleSaveCardDetail = (updatedContact: Contact, updatedCard: Card) => {
    setContacts((prev) => prev.map((c) => (c.id === updatedContact.id ? updatedContact : c)));
    setCards((prev) => prev.map((cd) => (cd.id === updatedCard.id ? updatedCard : cd)));
  };

  const handleApproveMerge = (itemId: string) => {
    const item = mergeQueue.find((q) => q.id === itemId);
    if (!item) return;

    // Add source company name to target company's aliases
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === item.target_company_id) {
          const newAliases = Array.from(new Set([...c.aliases, item.source_company_name]));
          return { ...c, aliases: newAliases };
        }
        return c;
      })
    );

    // Remove from queue
    setMergeQueue((prev) => prev.filter((q) => q.id !== itemId));
  };

  const handleRejectMerge = (itemId: string) => {
    const item = mergeQueue.find((q) => q.id === itemId);
    if (!item) return;

    // Create a new independent company
    const newCompanyId = `c-indep-${Date.now()}`;
    const newCompany: Company = {
      id: newCompanyId,
      canonical_name: item.source_company_name,
      normalized_name: normalizeCompanyName(item.source_company_name),
      tax_id: item.source_tax_id || '',
      aliases: [],
      domain: item.source_email ? item.source_email.split('@')[1] : '',
      phone: item.source_phone || '',
      address: item.source_address || '',
      industry_tags: ['一般商務'],
      notes: '由歸併審查獨立出之獨立公司實體',
      created_at: new Date().toISOString(),
    };

    setCompanies((prev) => [...prev, newCompany]);
    setMergeQueue((prev) => prev.filter((q) => q.id !== itemId));
  };

  const handleAddNewScannedCard = (newCardData: {
    contactName: string;
    companyName: string;
    title: string;
    mobile: string;
    email: string;
    taxId: string;
    address: string;
    imageUrl: string;
  }) => {
    // Check if target company exists
    let matchedCompany = companies.find(
      (c) =>
        (newCardData.taxId && c.tax_id === newCardData.taxId) ||
        normalizeCompanyName(c.canonical_name) === normalizeCompanyName(newCardData.companyName)
    );

    let compId = matchedCompany?.id;

    if (!matchedCompany) {
      compId = `c-new-${Date.now()}`;
      const newComp: Company = {
        id: compId,
        canonical_name: newCardData.companyName,
        normalized_name: normalizeCompanyName(newCardData.companyName),
        tax_id: newCardData.taxId,
        aliases: [],
        domain: newCardData.email ? newCardData.email.split('@')[1] : '',
        phone: '02-8888-0000',
        address: newCardData.address,
        industry_tags: ['新進廠商'],
        notes: '經相機掃描自動建立',
        created_at: new Date().toISOString(),
      };
      setCompanies((prev) => [...prev, newComp]);
      matchedCompany = newComp;
    }

    const newContactId = `ct-${Date.now()}`;
    const titleRank = inferTitleRank(newCardData.title);

    const newContact: Contact = {
      id: newContactId,
      company_id: compId!,
      name: newCardData.contactName,
      title_raw: newCardData.title,
      title_rank: titleRank,
      mobile: newCardData.mobile,
      direct_phone: '02-8888-0000',
      extension: '',
      email: newCardData.email,
      is_primary_contact: false,
      notes: '由名片快速掃描加入',
      created_at: new Date().toISOString(),
    };

    const newCard: Card = {
      id: `card-${Date.now()}`,
      contact_id: newContactId,
      image_url: newCardData.imageUrl,
      image_sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      ocr_raw_text: `${newCardData.companyName}\n${newCardData.contactName}\n${newCardData.title}\n${newCardData.mobile}\n${newCardData.email}`,
      ocr_boxes: [
        { x: 10, y: 15, width: 60, height: 18, text: newCardData.companyName, confidence: 0.98 },
        { x: 10, y: 38, width: 45, height: 15, text: newCardData.contactName, confidence: 0.96 },
        { x: 10, y: 55, width: 50, height: 12, text: newCardData.title, confidence: 0.94 },
        { x: 10, y: 72, width: 70, height: 12, text: newCardData.mobile, confidence: 0.97 },
      ],
      confidence_scores: {
        name: 0.96,
        title: 0.94,
        company: 0.98,
        phone: 0.92,
        mobile: 0.97,
        email: 0.95,
        tax_id: 0.99,
        address: 0.91,
      },
      is_verified: false,
      acquired_event: '2026 台灣國際工業展 (採集)',
      acquired_at: new Date().toISOString().slice(0, 10),
      notes: '',
      embedding_dim: 1024,
    };

    setContacts((prev) => [newContact, ...prev]);
    setCards((prev) => [newCard, ...prev]);
    setActiveTab('directory');
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans pb-16 lg:pb-0">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingMergeCount={mergeQueue.length}
        offlineQueueCount={offlineQueue.length}
        onQuickSearch={handleQuickSearch}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'directory' && (
          <CardsDirectory
            companies={companies}
            departments={departments}
            contacts={contacts}
            cards={cards}
            onSelectCard={handleSelectCard}
            onUpdateContact={handleUpdateContact}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerModal
            offlineQueue={offlineQueue}
            setOfflineQueue={setOfflineQueue}
            companies={companies}
            onAddNewScannedCard={handleAddNewScannedCard}
          />
        )}

        {activeTab === 'search' && (
          <HybridSearchView
            companies={companies}
            departments={departments}
            contacts={contacts}
            cards={cards}
            initialQuery={searchQuery}
            onSelectCard={handleSelectCard}
          />
        )}

        {activeTab === 'merge_queue' && (
          <MergeQueueView
            queueItems={mergeQueue}
            companies={companies}
            onApproveMerge={handleApproveMerge}
            onRejectMerge={handleRejectMerge}
          />
        )}

        {activeTab === 'verification' && <VerificationTestbench />}

        {activeTab === 'export' && (
          <ExportManagementView
            companies={companies}
            departments={departments}
            contacts={contacts}
            cards={cards}
          />
        )}
      </main>

      {/* Card Detail & OCR Inspection Modal */}
      {selectedCardState && (
        <CardDetailModal
          card={selectedCardState.card}
          contact={selectedCardState.contact}
          company={selectedCardState.company}
          onClose={() => setSelectedCardState(null)}
          onSave={handleSaveCardDetail}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingMergeCount={mergeQueue.length}
      />
    </div>
  );
}
