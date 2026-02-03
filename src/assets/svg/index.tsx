import Icon from "@ant-design/icons"
import { CustomIconComponentProps } from "@ant-design/icons/lib/components/Icon"

const WinUIOpCloseSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 15L15 5M5 5L15 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-关闭图标 */
export const WinUIOpCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpCloseSvg} {...props} />
}
const WinUIOpMinSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16.6667 10H3.33333'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-最小化图标 */
export const WinUIOpMinSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpMinSvg} {...props} />
}
const WinUIOpMaxSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='3.33334'
            y='3.33331'
            width='13.3333'
            height='13.3333'
            rx='2'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-最大化图标 */
export const WinUIOpMaxSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpMaxSvg} {...props} />
}
const WinUIOpRestoreSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.3333 13.3333H15C15.9205 13.3333 16.6667 12.5871 16.6667 11.6666V4.99998C16.6667 4.07951 15.9205 3.33331 15 3.33331H8.33333C7.41286 3.33331 6.66666 4.07951 6.66666 4.99998V6.66665M11.6667 16.6666H5C4.07952 16.6666 3.33333 15.9205 3.33333 15V8.33331C3.33333 7.41284 4.07952 6.66665 5 6.66665H11.6667C12.5871 6.66665 13.3333 7.41284 13.3333 8.33331V15C13.3333 15.9205 12.5871 16.6666 11.6667 16.6666Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-恢复图标 */
export const WinUIOpRestoreSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpRestoreSvg} {...props} />
}
