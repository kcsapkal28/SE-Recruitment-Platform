import os
import pickle
import warnings
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.chains.llm import LLMChain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain

def load_or_create_embeddings(pdf_path):
    """Load existing embeddings or create new ones for a PDF file"""
    embeddings_path = f"embeddings_{os.path.basename(pdf_path)}.pkl"
    if os.path.exists(embeddings_path):
        with open(embeddings_path, 'rb') as f:
            return pickle.load(f)

    # Create new embeddings
    loader = PDFPlumberLoader(pdf_path)
    docs = loader.load()

    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    documents = text_splitter.split_documents(docs)

    # Create vector embeddings
    embedder = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-MiniLM-L3-v2")
    vector = FAISS.from_documents(documents, embedder)

    with open(embeddings_path, 'wb') as f:
        pickle.dump(vector, f)

    return vector

def setup_qa_chain(vector):
    """Set up the retrieval QA chain"""
    retriever = vector.as_retriever(search_type="similarity", search_kwargs={"k": 3})
    llm = Ollama(model="llama3.2")

    prompt = """
    Use the following context to answer the question. 
    If you don't know the answer, just say "I don't know" - don't make up an answer.
    Keep your response concise (3-4 sentences).

    Context: {context}
    Question: {question}

    Helpful Answer:"""

    llm_chain = LLMChain(llm=llm, prompt=PromptTemplate.from_template(prompt))
    document_prompt = PromptTemplate(
        input_variables=["page_content", "source"],
        template="Content: {page_content}\nSource: {source}"
    )

    combine_documents_chain = StuffDocumentsChain(
        llm_chain=llm_chain,
        document_variable_name="context",
        document_prompt=document_prompt
    )

    return RetrievalQA(
        combine_documents_chain=combine_documents_chain,
        retriever=retriever,
        return_source_documents=True
    )

def query_pdf(pdf_path, question):
    """Query a PDF with a question and return the answer"""
    warnings.filterwarnings("ignore")
    
    try:
        # Initialize the embeddings and QA chain
        vector = load_or_create_embeddings(pdf_path)
        qa_chain = setup_qa_chain(vector)
        
        # Get the answer
        result = qa_chain(question)
        answer = result['result']
        
        # Extract sources
        sources = []
        if result.get('source_documents'):
            for doc in result['source_documents'][:2]:
                if hasattr(doc, 'metadata') and 'page' in doc.metadata:
                    page = doc.metadata.get('page', 'unknown')
                    sources.append(f"Page {page}")
        
        return {
            "status": "success",
            "answer": answer,
            "sources": list(set(sources)),
            "raw_result": result
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }