import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Star, CheckCircle, Quote, ArrowRight, Briefcase } from 'lucide-react'
import Image from 'next/image' // Assuming they use next/image
import LeadForm from '../../../components/LeadForm'

// SEO Metadata for Social Sharing
export async function generateMetadata({ params }) {
  const { slug } = await params
  const project = await prisma.project.findUnique({ where: { publicSlug: slug }, include: { user: true } })
  if (!project) return { title: 'Not Found' }
  return {
    title: `${project.name} | Verified Work by ${project.user.name}`,
    description: project.testimonial?.substring(0, 160) || "View this verified project.",
    openGraph: { title: `${project.name} Case Study`, type: 'website' }
  }
}

export default async function ShowcasePage({ params }) {
  const { slug } = await params
  
  // 1. Fetch the Public Project (Include the Freelancer's details)
  const project = await prisma.project.findUnique({
    where: { publicSlug: slug, isPublic: true },
    include: {
      user: { select: { name: true, email: true } },
      client: { select: { name: true } },
      files: { select: { id: true, name: true, url: true, fileType: true } },
    }
  })

  if (!project) notFound()

  // Helper: Filter only visual assets for the showcase
  const visualAssets = project.files.filter(f => f.fileType?.startsWith('image/'))

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* 1. HERO SECTION: The Outcome & Social Proof (Psychology: Authority) */}
      <section className="bg-white border-b border-gray-200 pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <CheckCircle className="w-4 h-4" />
            Verified Completed Project
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            {project.name}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12">
            Delivered successfully by <strong>{project.user.name}</strong> for {project.client?.name || "a private client"}.
          </p>

          {/* Testimonial Block (Psychology: Trust Before Value) */}
          {project.testimonial && (
            <div className="bg-blue-50/50 rounded-3xl p-8 md:p-12 relative max-w-3xl mx-auto shadow-sm border border-blue-100">
              <Quote className="w-10 h-10 text-blue-200 absolute top-6 left-6 -z-10" />
              <div className="flex justify-center gap-1 mb-6 text-yellow-400">
                {[...Array(project.clientRating || 5)].map((_, i) => (
                  <Star key={i} fill="currentColor" className="w-6 h-6" />
                ))}
              </div>
              <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed italic mb-6">
                "{project.testimonial}"
              </p>
              <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                — {project.client?.name || "Verified Client"}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. THE WORK: Visual Proof (Psychology: Tangibility) */}
      {visualAssets.length > 0 && (
        <section className="py-20 max-w-6xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-gray-400 mb-12">
            Final Deliverables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visualAssets.map((asset) => (
              <a key={asset.id} href={asset.url} target="_blank" className="group block overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 aspect-video relative shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 3. THE LEAD CAPTURE: The Money Maker (Psychology: Urgency/Reciprocity) */}
      <section className="bg-gray-900 text-white py-24 px-6 border-t border-gray-800">
        <div className="max-w-xl mx-auto text-center">
          <Briefcase className="w-12 h-12 text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Want results like this?</h2>
          <p className="text-gray-400 mb-8">
            {project.user.name} is currently accepting new projects. Send an inquiry directly below.
          </p>
          
          {/* Form (Simplified for the MVP UI) */}
          <LeadForm projectId={project.id} freelancerName={project.user.name} />
        </div>
      </section>

      {/* 4. THE VIRAL LOOP: Your SaaS Lead Gen */}
      <footer className="py-8 text-center bg-black text-xs text-gray-500 border-t border-gray-800">
        Powered by <a href="/" className="font-bold text-white hover:text-blue-400 transition-colors">ClientPortal</a>. 
        Create premium, automated client experiences for your freelance business.
      </footer>
    </div>
  )
}