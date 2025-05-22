import { About, Extras, Contact, Footer, Hero, Navbar, Projects, Sidebar } from '@/components/layout';
import './App.css';

export function App() {
    return (
        <div className="app">
            <Navbar />
            <Sidebar />
            <Hero />
            <About />
            <Projects />
            <Extras />
            <Contact />
            <Footer />
        </div>
    )
}