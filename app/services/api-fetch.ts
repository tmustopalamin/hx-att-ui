export async function apiFetch(
    input: RequestInfo,
    init?: RequestInit
) {
    const res = await fetch(input, {
        ...init,
        credentials: 'include',
    })

    if (res.status === 401) {
        window.location.href = '/login'
        throw new Error('Unauthorized')
    }

    return res
}