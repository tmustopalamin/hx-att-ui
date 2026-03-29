import { RootState } from "@/store/store"
import { useSelector } from "react-redux"

type Props = {
    permission?: string
    anyOf?: string[] //minimal punya salah satu dari permission
    allOf?: string[] //harus punya semua permission
    children: React.ReactNode
    fallback?: React.ReactNode
}

const Can = ({ permission, anyOf, allOf, children, fallback }: Props) => {
    const profile = useSelector((state: RootState) => state.profile)
    const permissions = profile?.permissions || []

    let allowed = false

    if (permission) {
        allowed = permissions.includes(permission)
    }

    if (anyOf) {
        allowed = anyOf.some((p) => permissions.includes(p))
    }

    if (allOf) {
        allowed = allOf.every((p) => permissions.includes(p))
    }

    if (!allowed) return <>{fallback}</>

    return <>{children}</>
}

export default Can