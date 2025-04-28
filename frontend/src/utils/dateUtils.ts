export function formatDate(input: string | Date): string {
    const d = new Date(input);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}