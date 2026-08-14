import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Enregistre les APIs du navigateur (window, document, etc.) globalement
// pour que @testing-library/react puisse interagir avec le DOM dans bun test.
GlobalRegistrator.register();
