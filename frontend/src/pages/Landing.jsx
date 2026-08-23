import { Link } from 'react-router-dom'
import { ArrowRight, FileSearch, GitCompareArrows, Layers, Lock, ScanText, Sparkles } from 'lucide-react'
import Logo from '../components/Logo'
import InsightScan from '../components/InsightScan'

const features = [
  {
    icon: ScanText,
    title: 'Document processing',
    body: 'Upload PDFs, Word docs, and text files. ANORA extracts, cleans, and chunks the content while preserving page and section context.',
  },
  {
    icon: Layers,
    title: 'Knowledge bases',
    body: 'Group documents into topic-scoped knowledge bases — placement policy, coursework, research — each with its own private index.',
  },
  {
    icon: FileSearch,
    title: 'Grounded answers',
    body: 'Ask a question in plain language. ANORA retrieves the exact passages that answer it and cites the document and page.',
  },
  {
    icon: Sparkles,
    title: 'Summaries',
    body: 'Turn a long document into an overview, key points, and important terms in seconds.',
  },
  {
    icon: GitCompareArrows,
    title: 'Comparison',
    body: 'Compare two versions of a document and see exactly what was added, removed, or changed.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    body: 'Every knowledge base is scoped to your account. Authentication and ownership checks run on every request.',
  },
]

const steps = [
  { n: '01', title: 'Upload', body: 'Add a document to a knowledge base. ANORA stores it and begins processing.' },
  { n: '02', title: 'Understand', body: 'The document is split into chunks and converted into vector embeddings that capture meaning, not just keywords.' },
  { n: '03', title: 'Ask', body: 'Ask a question. ANORA retrieves the most relevant chunks and builds an answer grounded in them.' },
  { n: '04', title: 'Verify', body: 'Every answer links back to its source document and page, so you can check it yourself.' },
]

const stack = [
  ['Frontend', 'React · Vite · Tailwind'],
  ['Backend', 'Node.js · Express · JWT'],
  ['AI service', 'Python · FastAPI · Sentence-Transformers'],
  ['Retrieval', 'Qdrant vector database'],
  ['Data', 'MongoDB Atlas'],
  ['LLM', 'Open-source / free-tier inference'],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-text">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="hover:text-text transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-text transition-colors">How it works</a>
          <a href="#stack" className="hover:text-text transition-colors">Technology</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted hover:text-text transition-colors">Log in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="label-mono mb-5">AI document intelligence · cloud-hosted</div>
          <h1 className="font-display text-5xl sm:text-6xl leading-[1.05] text-text mb-6">
            From information<br />to <span className="text-signal">insight.</span>
          </h1>
          <p className="text-muted text-lg leading-relaxed max-w-md mb-8">
            ANORA turns a folder of documents into a knowledge base you can talk to —
            with answers grounded in your own files, and every claim traceable back
            to a page.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/register" className="btn-primary inline-flex items-center gap-2">
              Get started <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="btn-secondary">Explore ANORA</a>
          </div>
        </div>
        <InsightScan />
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 border-t border-hairline">
        <div className="mb-12 max-w-xl">
          <div className="label-mono mb-3">Features</div>
          <h2 className="font-display text-3xl text-text">Built around one job: understanding your documents.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6">
              <Icon size={20} className="text-signal mb-4" strokeWidth={1.75} />
              <h3 className="font-display text-lg text-text mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — a real sequence, so numbering is earned here */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24 border-t border-hairline">
        <div className="mb-12 max-w-xl">
          <div className="label-mono mb-3">How it works</div>
          <h2 className="font-display text-3xl text-text">A retrieval-augmented pipeline, not a keyword search.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.n}>
              <div className="font-mono text-sm text-signal mb-3">{step.n}</div>
              <h3 className="font-display text-lg text-text mb-2">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-hairline grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="label-mono mb-3">Security</div>
          <h2 className="font-display text-3xl text-text mb-4">Your documents stay yours.</h2>
          <p className="text-muted leading-relaxed max-w-md">
            Passwords are hashed, sessions are authenticated with JWT, and every
            knowledge base, document, and conversation is scoped to your account
            at the database level — not just hidden in the interface.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            'Password hashing with bcrypt',
            'JWT-authenticated sessions on every request',
            'Per-user ownership checks on all data access',
            'File type and size validation on upload',
            'Secrets kept in environment variables, never shipped to the browser',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-text">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-signal shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Tech stack */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-24 border-t border-hairline">
        <div className="label-mono mb-8">Technology stack</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-hairline rounded-xl overflow-hidden">
          {stack.map(([label, value]) => (
            <div key={label} className="bg-surface p-6">
              <div className="label-mono mb-2">{label}</div>
              <div className="font-mono text-sm text-text">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-hairline text-center">
        <h2 className="font-display text-4xl text-text mb-4">Stop searching. Start asking.</h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          Create a knowledge base, upload your first document, and ask ANORA
          a question about it.
        </p>
        <Link to="/register" className="btn-primary inline-flex items-center gap-2">
          Get started <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-hairline flex items-center justify-between text-sm text-faint">
        <Logo withWordmark={false} />
        <span>ANORA · From Information to Insight</span>
      </footer>
    </div>
  )
}
