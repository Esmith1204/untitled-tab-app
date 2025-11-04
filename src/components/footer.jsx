import Logo from "../../src/assets/untitled app small logo.png"

export default function Footer() {
    return (
        <footer className="footer sm:footer-horizontal bg-neutral text-neutral-content items-center p-4">
            <aside className="grid-flow-col items-center">
                <img
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    src={Logo}>
                </img>
                <p>© {new Date().getFullYear()} Elijah Smith. All rights reserved.</p>
            </aside>
        </footer>
    );
}   