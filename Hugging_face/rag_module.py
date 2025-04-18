import os
import pickle
import warnings
from rich.console import Console
from rich.prompt import Prompt
from rich import print as rprint
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.chains.llm import LLMChain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from ollama import chat

warnings.filterwarnings("ignore")
console = Console()

def load_or_create_embeddings(pdf_path):
    embeddings_path = f"embeddings_{os.path.basename(pdf_path)}.pkl"
    if os.path.exists(embeddings_path):
        console.print(f"[green]Loading existing embeddings from {embeddings_path}...[/green]")
        with open(embeddings_path, 'rb') as f:
            return pickle.load(f)

    console.print(f"[yellow]Creating new embeddings for {pdf_path}...[/yellow]")

    with console.status("[bold green]Loading PDF..."):
        loader = PDFPlumberLoader(pdf_path)
        docs = loader.load()

    with console.status("[bold green]Splitting document into chunks..."):
        embedder = HuggingFaceEmbeddings()
        text_splitter = SemanticChunker(embedder)
        documents = text_splitter.split_documents(docs)

    with console.status("[bold green]Creating vector embeddings..."):
        vector = FAISS.from_documents(documents, embedder)

    with open(embeddings_path, 'wb') as f:
        pickle.dump(vector, f)

    console.print(f"[green]Embeddings saved to {embeddings_path}[/green]")
    return vector


def setup_qa_chain(vector):
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


def ask_question(qa_chain, question):
    console.print(f"[bold cyan]Q: {question}[/bold cyan]")
    console.print("[bold green]A: [/bold green]", end="")

    try:
        result = qa_chain(question)
        context = result['result']

        stream = chat(
            model='llama3.2',
            messages=[{'role': 'user', 'content': f"{question} Context: {context}"}],
            stream=True,
        )

        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                console.print(chunk['message']['content'], end="")

        console.print("\n")

        if result.get('source_documents'):
            console.print("[dim]Sources:[/dim]")
            sources = set()
            for doc in result['source_documents'][:2]:
                if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                    source = f"Page {doc.metadata.get('page', 'unknown')}"
                    if source not in sources:
                        console.print(f"[dim]- {source}[/dim]")
                        sources.add(source)

        console.print()
    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")


def interactive_mode(pdf_path):
    console.rule(f"[bold blue]PDF RAG Assistant: {os.path.basename(pdf_path)}[/bold blue]")
    console.print("[yellow]Initializing system...[/yellow]")

    vector = load_or_create_embeddings(pdf_path)
    qa_chain = setup_qa_chain(vector)

    console.print("[green]Ready! Ask questions about your PDF (type 'exit' to quit)[/green]")

    while True:
        question = Prompt.ask("\n[bold cyan]Your question")
        if question.lower() in ('exit', 'quit', 'q'):
            console.print("[yellow]Goodbye![/yellow]")
            break
        ask_question(qa_chain, question)
