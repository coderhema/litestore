'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Copy, Edit, Trash, Check } from 'iconoir-react';
import {
  MAX_ARTWORKS,
  buildDemoPublishedStore,
  buildShareText,
  formatCurrency,
  publishedStoresKey,
  shareLinks,
  slugify,
  storeStorageKey,
  type ArtworkAsset,
  type GeneratedStoreDraft,
  type StoreRecord
} from '@/lib/litestore';
import { readSession } from '@/lib/litestore-auth';
import { LoginModal } from '@/components/litestore/login-modal';

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const initialDraft: GeneratedStoreDraft = {
  slug: 'new-drop',
  title: 'Untitled collection',
  description: 'Describe the collection and let Litestore turn it into a premium storefront.',
  price: 120,
  currency: 'NGN'
};

const steps = [
  { id: 1, title: 'Setup', helper: 'Pick chat or voice, then describe the store.' },
  { id: 2, title: 'Pricing', helper: 'Pick the currency and starting price.' },
  { id: 3, title: 'Artwork', helper: 'Upload the visuals that will power the storefront.' },
  { id: 4, title: 'Review', helper: 'Generate the AI draft, then publish.' }
] as const;

type SetupMode = 'chat' | 'voice';

export function CreateStudio() {
  const [artworks, setArtworks] = useState<ArtworkAsset[]>([]);
  const [draft, setDraft] = useState<GeneratedStoreDraft>(initialDraft);
  const [requirements, setRequirements] = useState('');
  const [setupMode, setSetupMode] = useState<SetupMode>('chat');
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [status, setStatus] = useState('Answer the questions to build your store.');
  const [lastError, setLastError] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceNote, setVoiceNote] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const session = readSession();
    setLoginOpen(!session);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (setupMode === 'voice' && !requirements.trim()) {
      setStatus('Speak your store requirements and transcribe them into the form.');
    }
  }, [requirements, setupMode]);

  const share = useMemo(() => {
    if (!publishedUrl) return null;
    return shareLinks(publishedUrl, draft.title);
  }, [draft.title, publishedUrl]);

  function persistPublishedStore(nextStore: StoreRecord) {
    localStorage.setItem(storeStorageKey(nextStore.slug), JSON.stringify(nextStore));

    const existingPublished = JSON.parse(localStorage.getItem(publishedStoresKey()) || '[]') as string[];
    const nextPublished = Array.from(new Set([nextStore.slug, ...existingPublished]));
    localStorage.setItem(publishedStoresKey(), JSON.stringify(nextPublished));
  }

  async function applyGeneratedDraft(generated: Partial<GeneratedStoreDraft>) {
    const nextDraft = {
      slug: generated.slug ?? slugify(generated.title ?? draft.title),
      title: generated.title ?? draft.title,
      description: generated.description ?? draft.description,
      price: generated.price ?? draft.price,
      currency: generated.currency ?? draft.currency
    };

    setDraft((current) => ({ ...current, ...nextDraft }));

    const publishedStore: StoreRecord = {
      id: 'draft-' + nextDraft.slug,
      slug: nextDraft.slug,
      title: nextDraft.title,
      description: nextDraft.description,
      price: nextDraft.price,
      currency: nextDraft.currency,
      artworks,
      testimonial: 'A premium storefront generated from your brief.',
      artistName: 'Litestore creator',
      publishedAt: new Date().toISOString()
    };

    persistPublishedStore(publishedStore);

    const url = `${window.location.origin}/store/${nextDraft.slug}`;
    setPublishedUrl(url);
    setStatus('Draft generated and published locally. You can now buy from the storefront.');
    setPublishModalOpen(true);
    window.history.replaceState({}, '', `/create?published=${nextDraft.slug}`);
  }

  async function submitGeneration(requirementsText: string, source: SetupMode, generationMode: 'generate' | 'redraft' = 'generate') {
    if (!artworks.length) {
      setLastError('Upload at least one artwork first.');
      return;
    }

    setIsGenerating(true);
    setLastError('');
    setStatus(generationMode === 'redraft' ? 'Redrafting storefront with NVIDIA NIM...' : source === 'voice' ? 'Generating storefront from your voice notes...' : 'Generating storefront copy with NVIDIA NIM...');

    try {
      const formData = new FormData();
      artworks.forEach((artwork) => formData.append('artworks', artwork.src));
      formData.append('count', String(artworks.length));
      formData.append('title', draft.title);
      formData.append('description', draft.description);
      formData.append('requirements', requirementsText);
      formData.append('setupMode', source);
      formData.append('generationMode', generationMode);
      formData.append('draftTitle', draft.title);
      formData.append('draftDescription', draft.description);
      formData.append('draftPrice', String(draft.price));
      formData.append('draftSlug', draft.slug);
      formData.append('redraftIntent', requirementsText);

      const response = await fetch('/api/generate-store', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Store generation failed.');
      }

      const generated = (await response.json()) as Partial<GeneratedStoreDraft>;
      await applyGeneratedDraft(generated);
    } catch (error) {
      setDraft((current) => ({
        ...current,
        slug: slugify(current.title),
        title: current.title || 'Untitled collection'
      }));
      setLastError(error instanceof Error ? error.message : 'Something went wrong.');
      setStatus('Using a local draft while the AI endpoint is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    const selected = Array.from(files).slice(0, MAX_ARTWORKS);
    const nextArtworks = await Promise.all(
      selected.map(async (file, index) => ({
        id: `${file.name}-${index}-${crypto.randomUUID()}`,
        name: file.name.replace(/\.[^.]+$/, '') || `Artwork ${index + 1}`,
        src: await fileToDataUrl(file)
      }))
    );

    setArtworks(nextArtworks);
    setLastError('');
    setStatus(`${nextArtworks.length} artwork${nextArtworks.length > 1 ? 's' : ''} ready for the storefront.`);
  }

  async function handleGenerate() {
    await submitGeneration(requirements || voiceTranscript || draft.description, setupMode, 'redraft');
  }

  async function handlePublish() {
    if (!artworks.length) {
      setLastError('Add artworks before publishing.');
      return;
    }

    setIsPublishing(true);
    setLastError('');
    setStatus('Publishing and preparing share links...');

    try {
      const publishedStore = buildDemoPublishedStore(draft.title, draft.description, draft.price, artworks);
      const slug = slugify(draft.slug || publishedStore.slug || draft.title);
      const resolvedStore: StoreRecord = {
        ...publishedStore,
        slug,
        title: draft.title,
        description: draft.description,
        price: draft.price
      };

      const publishResponse = await fetch('/api/stores/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...resolvedStore,
          source: 'client'
        })
      });

      if (!publishResponse.ok) {
        throw new Error('Could not save the published storefront.');
      }

      persistPublishedStore(resolvedStore);

      const url = `${window.location.origin}/store/${slug}`;
      setPublishedUrl(url);
      setDraft((current) => ({ ...current, slug }));
      setStatus('Published. Share the storefront with collectors.');
      setPublishModalOpen(true);
      window.history.replaceState({}, '', `/create?published=${slug}`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Could not publish the store.');
      setStatus('Publishing failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus('Copied to clipboard.');
  }

  async function transcribeVoiceBlob(blob: Blob) {
    setIsTranscribing(true);
    setLastError('');
    setVoiceNote('Transcribing your voice notes with whisper-large-v3...');

    try {
      const tryEndpoints = ['/api/transcribe-voice', '/api/transcribe'];
      let response: Response | null = null;

      for (const endpoint of tryEndpoints) {
        const formData = new FormData();
        formData.append('file', new File([blob], 'voice.webm', { type: blob.type || 'audio/webm' }));
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        if (response.status !== 404) break;
      }

      if (!response) {
        throw new Error('Voice transcription failed.');
      }

      const payload = await response.json().catch(async () => ({ message: await response?.text() }));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || 'Voice transcription failed.');
      }

      const transcript = ((payload as { text?: string }).text ?? '').trim();
      setVoiceTranscript(transcript);
      setRequirements(transcript);
      setVoiceNote(transcript ? 'Voice notes ready. Review the transcript below.' : 'No speech detected. Try again.');
      if (transcript) {
        setStatus('Voice setup captured. Building the storefront now...');
        await submitGeneration(transcript, 'voice', 'generate');
      } else {
        setStatus('No speech detected in that recording.');
      }
    } catch (error) {
      setVoiceNote(error instanceof Error ? error.message : 'Voice transcription failed.');
      setLastError(error instanceof Error ? error.message : 'Voice transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLastError('Voice recording is not supported on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        void transcribeVoiceBlob(blob);
      };

      recorder.start();
      setIsRecording(true);
      setStatus('Recording your voice setup...');
      setVoiceNote('Speak naturally. Tap stop when you are done.');
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Could not access microphone.');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    setIsRecording(false);
  }

  function removeArtwork(id: string) {
    setArtworks((current) => current.filter((artwork) => artwork.id !== id));
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(183,146,255,0.16),_transparent_30%),linear-gradient(180deg,#05040a_0%,#0a0913_45%,#0e0c16_100%)] text-white">
        <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/72 backdrop-blur-xl sm:p-8">
            Preparing your demo login...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(183,146,255,0.16),_transparent_30%),linear-gradient(180deg,#05040a_0%,#0a0913_45%,#0e0c16_100%)] text-white">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Create store</p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl">
                Build your storefront like a Tally survey.
              </h1>
              <p className="mt-4 max-w-2xl text-white/70">
                Switch between chat and voice, capture your requirements, let NVIDIA NIM shape the copy, and publish a premium storefront.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/70">
              {status}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-2">
            {(['chat', 'voice'] as SetupMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSetupMode(mode);
                  setStatus(mode === 'voice' ? 'Voice setup enabled. Tap record to speak.' : 'Chat setup enabled. Type your requirements.');
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition sm:flex-none ${
                  setupMode === mode ? 'bg-white text-zinc-950' : 'bg-transparent text-white/70 hover:bg-white/5'
                }`}
              >
                {mode === 'chat' ? 'Chat setup' : 'Voice setup'}
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-full border border-white/10 bg-black/25 p-1">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
                  currentStep >= step.id ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-black/20 text-white/45'
                }`}
              >
                {step.id}. {step.title}
              </span>
            ))}
          </div>

          {lastError ? <p className="mt-4 text-sm text-rose-300">{lastError}</p> : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Step {currentStep} of {steps.length}</p>
                  <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">{steps[currentStep - 1].title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">{steps[currentStep - 1].helper}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">Tally style</span>
              </div>

              <div className="mt-6 space-y-6">
                {currentStep === 1 ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSetupMode('chat')}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                          setupMode === 'chat' ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/7'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Chat</p>
                        <p className="mt-2 text-sm text-white/75">Type your store requirements in a short guided prompt.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupMode('voice')}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                          setupMode === 'voice' ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/7'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Voice</p>
                        <p className="mt-2 text-sm text-white/75">Speak your requirements and turn them into a storefront brief.</p>
                      </button>
                    </div>

                    <label className="block">
                      <span className="text-sm text-white/65">What should your store be called?</span>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/25"
                        placeholder="Collection title"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-white/65">
                        {setupMode === 'voice' ? 'Transcribed requirements' : 'What is the collection about?'}
                      </span>
                      <textarea
                        rows={6}
                        value={requirements}
                        onChange={(event) => setRequirements(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                        placeholder={setupMode === 'voice' ? 'Tap record, speak, and the transcript will appear here.' : 'Describe the collection in one or two short paragraphs'}
                      />
                    </label>

                    {setupMode === 'voice' ? (
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Voice setup</p>
                        <p className="mt-2 text-sm leading-6 text-white/65">
                          Record a short brief for your storefront. whisper-large-v3 transcribes the note, then Llama 3.1 generates the storefront draft automatically.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : () => void startRecording()}
                            disabled={isTranscribing}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                              isRecording ? 'bg-rose-100 text-rose-950 hover:bg-rose-50' : 'bg-white text-zinc-950 hover:bg-white/90'
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isRecording ? 'Stop recording' : 'Start recording'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceTranscript('');
                              setRequirements('');
                              setVoiceNote('');
                              setStatus('Voice notes cleared. Record again when ready.');
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                          >
                            Clear
                          </button>
                        </div>
                        {voiceNote ? <p className="mt-3 text-sm text-white/68">{voiceNote}</p> : null}
                        {voiceTranscript ? (
                          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Transcript</p>
                            <p className="mt-3 text-sm leading-7 text-white/72">{voiceTranscript}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Chat setup</p>
                        <p className="mt-2 text-sm leading-6 text-white/65">
                          This guided prompt helps shape the store description before AI generation.
                        </p>
                      </div>
                    )}
                  </>
                ) : null}

                {currentStep === 2 ? (
                  <>
                    <label className="block">
                      <span className="text-sm text-white/65">How much should the print cost?</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.price}
                        onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value || 0) }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-white/25"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-white/65">Currency</span>
                        <select
                          value={draft.currency}
                          onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-white/25"
                        >
                          <option value="NGN">NGN</option>
                          <option value="USD">USD</option>
                          <option value="GHS">GHS</option>
                          <option value="KES">KES</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm text-white/65">Store slug</span>
                        <input
                          value={draft.slug}
                          onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-white/25"
                          placeholder="store-slug"
                        />
                      </label>
                    </div>
                  </>
                ) : null}

                {currentStep === 3 ? (
                  <>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center transition hover:border-white/25 hover:bg-white/7">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleUpload(event.target.files)} />
                      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/30 text-2xl text-white/75">+</span>
                      <span className="mt-4 text-lg font-medium text-white">Drop 1 to 5 artwork images</span>
                      <span className="mt-2 max-w-sm text-sm leading-6 text-white/55">
                        PNG, JPG, or WebP. The images will power the gallery, preview cards, and publish flow.
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {artworks.map((artwork) => (
                        <article key={artwork.id} className="group overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/5">
                          <div className="relative">
                            <img src={artwork.src} alt={artwork.name} className="h-40 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeArtwork(artwork.id)}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="truncate text-sm text-white">{artwork.name}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}

                {currentStep === 4 ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/45">
                        <Edit className="h-4 w-4" /> Review the draft
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Preview</p>
                              <h3 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">{draft.title}</h3>
                            </div>
                            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white">
                              {formatCurrency(draft.price, draft.currency)}
                            </div>
                          </div>

                          <p className="mt-4 text-sm leading-7 text-white/72">{draft.description}</p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Slug</p>
                              <p className="mt-2 text-sm text-white/85">/store/{slugify(draft.slug || draft.title)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Images</p>
                              <p className="mt-2 text-sm text-white/85">{artworks.length} selected</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/45">AI draft</p>
                          <p className="mt-3 text-sm leading-7 text-white/68">
                            Use the AI button to refresh the title, description, price, and slug with NVIDIA NIM using meta/llama-3.1-8b-instruct.
                          </p>
                          <p className="mt-3 text-sm leading-7 text-white/68">
                            {setupMode === 'voice' ? 'Your voice transcript will be included in the generation prompt.' : 'Your chat brief will be included in the generation prompt.'}
                          </p>

                          <button
                            type="button"
                            onClick={() => void handleGenerate()}
                            disabled={!artworks.length || isGenerating || isPublishing}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f2e0a7] px-5 py-3 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-[#f6e8bf] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isGenerating ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                                Redrafting...
                              </span>
                            ) : (
                              'Redraft'
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handlePublish()}
                            disabled={!artworks.length || isPublishing || isGenerating}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPublishing ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                                Publishing...
                              </span>
                            ) : (
                              'Publish storefront'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Selected artworks</p>
                      <div className="mt-4 space-y-3">
                        {artworks.slice(0, 3).map((artwork) => (
                          <div key={artwork.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                            <img src={artwork.src} alt={artwork.name} className="h-12 w-12 rounded-xl object-cover" />
                            <div>
                              <p className="text-sm text-white">{artwork.name}</p>
                              <p className="text-xs text-white/45">Artwork included in storefront gallery</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep((current) => Math.max(1, current - 1))}
                  disabled={currentStep === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !draft.title.trim()) {
                      setLastError('Add a store title to continue.');
                      return;
                    }

                    if (currentStep === 2 && !draft.price) {
                      setLastError('Set a price to continue.');
                      return;
                    }

                    if (currentStep === 3 && !artworks.length) {
                      setLastError('Upload at least one artwork first.');
                      return;
                    }

                    setLastError('');
                    setCurrentStep((current) => Math.min(steps.length, current + 1));
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white/90"
                >
                  {currentStep === steps.length ? 'Stay on review' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Output preview</p>
                  <h3 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">{draft.title}</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white">
                  {formatCurrency(draft.price, draft.currency)}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/72">{draft.description}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Slug</p>
                  <p className="mt-2 text-sm text-white/85">/store/{slugify(draft.slug || draft.title)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Images</p>
                  <p className="mt-2 text-sm text-white/85">{artworks.length} selected</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Publish note</p>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  {buildShareText({ title: draft.title, slug: slugify(draft.slug || draft.title) })}
                </p>
              </div>

              {setupMode === 'voice' && voiceTranscript ? (
                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Voice transcript</p>
                  <p className="mt-3 text-sm leading-7 text-white/72">{voiceTranscript}</p>
                </div>
              ) : null}
            </section>
          </div>

          {publishedUrl && share ? (
            <section className="mt-6 rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/75">Published</p>
                  <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">Share your storefront</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
                    {buildShareText({ title: draft.title, slug: draft.slug })}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={() => void handleCopy(share.copyText)} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15">
                    <Copy className="h-4 w-4" /> Copy link
                  </button>
                  <a href={share.x} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-950">
                    Share on X
                  </a>
                  <a href={share.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-950">
                    Share on WhatsApp
                  </a>
                  <a href={publishedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white">
                    Open storefront <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {publishModalOpen && publishedUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0d0b14] p-5 text-white shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-emerald-100">
                  <Check className="h-4 w-4" /> Published
                </div>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white">Storefront is live</h2>
                <p className="mt-3 text-sm leading-7 text-white/72">Your storefront has been saved and is ready to share or open. Collectors can now buy from the published route.</p>
              </div>
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Share link</p>
              <p className="mt-3 break-all text-sm leading-7 text-white/80">{publishedUrl}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a href={publishedUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950">Open storefront</a>
              <button type="button" onClick={() => void handleCopy(publishedUrl)} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-[#f2e0a7] px-5 py-3 text-sm font-medium text-zinc-950">Copy link</button>
            </div>
          </div>
        </div>
      ) : null}

      <LoginModal
        open={loginOpen}
        onSuccess={() => {
          setLoginOpen(false);
          setStatus('Logged in. Continue the setup flow.');
        }}
      />
    </main>
  );
}
