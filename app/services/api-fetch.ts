export async function apiFetch(
    input: RequestInfo,
    init?: RequestInit
) {
    let res = await fetch(input, {
        ...init,
        credentials: 'include',
    })

    if (res.status === 401) {
        const refresh = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        })

        if (!refresh.ok) {
            window.location.href = '/login'
            throw new Error('Unauthorized')
        }

        res = await fetch(input, {
            ...init,
            credentials: 'include',
        })
    }

    return res
}