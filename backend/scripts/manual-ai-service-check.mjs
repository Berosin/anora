// Not part of the automated test suite (needs a live AI service on
// AI_SERVICE_URL) — a one-off script to prove src/services/aiService.client.js
// actually talks to the real FastAPI service correctly, end to end.
import { indexDocumentWithAiService, deleteDocumentVectors, deleteCollection, queryKnowledgeBase, summarizeDocument, compareDocuments } from '../src/services/aiService.client.js'

const sampleText = Buffer.from(
  'Placement eligibility requires a minimum aggregate of 60 percent across all semesters.'
)

async function main() {
  console.log('→ indexing a real document via the live AI service...')
  const result = await indexDocumentWithAiService({
    buffer: sampleText,
    filename: 'policy.txt',
    mimetype: 'text/plain',
    documentId: 'manual-check-doc-1',
    documentName: 'policy.txt',
    knowledgeBaseId: 'manual-check-kb-1',
    fileType: 'txt',
    collectionName: 'kb_manual_check',
  })
  console.log('✓ indexed:', result)
  if (typeof result.chunk_count !== 'number' || result.chunk_count < 1) {
    throw new Error('Expected at least one chunk to be created.')
  }

  console.log('→ asking a question that the document DOES answer...')
  const grounded = await queryKnowledgeBase({
    question: sampleText.toString(),
    collectionName: 'kb_manual_check',
  })
  console.log('✓ grounded answer:', grounded)
  if (!grounded.grounded || grounded.sources.length < 1) {
    throw new Error('Expected a grounded answer with at least one source.')
  }

  console.log('→ asking against a knowledge base with nothing indexed...')
  const notGrounded = await queryKnowledgeBase({
    question: 'anything at all',
    collectionName: 'kb_manual_check_never_indexed',
  })
  console.log('✓ honest "not enough info" answer:', notGrounded)
  if (notGrounded.grounded !== false || notGrounded.sources.length !== 0) {
    throw new Error('Expected an ungrounded, sourceless answer for an empty knowledge base.')
  }

  console.log('→ generating a summary of the indexed document...')
  const summary = await summarizeDocument({
    collectionName: 'kb_manual_check',
    documentId: 'manual-check-doc-1',
    documentName: 'policy.txt',
  })
  console.log('✓ summary:', summary)
  if (!summary.summary) {
    throw new Error('Expected a non-empty summary.')
  }

  console.log('→ indexing a second document to compare against the first...')
  const secondText = Buffer.from('Placement eligibility requires a minimum aggregate of 75 percent.')
  await indexDocumentWithAiService({
    buffer: secondText,
    filename: 'policy_v2.txt',
    mimetype: 'text/plain',
    documentId: 'manual-check-doc-2',
    documentName: 'policy_v2.txt',
    knowledgeBaseId: 'manual-check-kb-1',
    fileType: 'txt',
    collectionName: 'kb_manual_check',
  })

  console.log('→ comparing the two documents...')
  const comparison = await compareDocuments({
    documentA: { collectionName: 'kb_manual_check', documentId: 'manual-check-doc-1', documentName: 'policy.txt' },
    documentB: { collectionName: 'kb_manual_check', documentId: 'manual-check-doc-2', documentName: 'policy_v2.txt' },
  })
  console.log('✓ comparison:', comparison)
  if (!comparison.comparison) {
    throw new Error('Expected a non-empty comparison.')
  }

  console.log('→ deleting that document\'s vectors...')
  await deleteDocumentVectors({ collectionName: 'kb_manual_check', documentId: 'manual-check-doc-1' })
  console.log('✓ delete call completed without throwing')

  console.log('→ deleting the whole collection...')
  await deleteCollection('kb_manual_check')
  console.log('✓ collection delete call completed without throwing')

  console.log('\nALL CHECKS PASSED — Node backend can talk to the real Python AI service, including RAG, summarization, and comparison.')
}

main().catch((err) => {
  console.error('MANUAL CHECK FAILED:', err)
  process.exit(1)
})
