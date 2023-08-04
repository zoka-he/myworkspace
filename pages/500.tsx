export default function Custom500() {
    console.error('[500.js] handling error:', arguments);
    return <h1>500 - Server-side error occurred</h1>
  }