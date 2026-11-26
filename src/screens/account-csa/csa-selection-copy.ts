import type {Locale} from '@/types';
export function csaSelectionCopy(locale: Locale) {
  return locale === 'en' ? {
    lineLimit:'Choose up to {max} different products. Remove one to choose another.',title:'Choose your produce',delivery:'Delivery',reselectHint:'Confirm before the deadline to avoid cancellation and a points refund.',empty:'No produce selected.',remaining:'points left',portion:'portion',perPortion:'points / portion',draft:'Save draft',
    heldOnly:'Hold limit: {max} portions.',
    heldUndo:'You can reduce, remove or restore up to the held quantity before saving.',
    heldLimit:'Reduce the quantity to your hold limit of {max} portions.',
    noStock:'No stock available for this round.',
    noQuota:'This group has too few points for one portion.',
    missingHold:'No valid hold for this round. Remove this item to continue.',
  } : {
    lineLimit:'Chọn tối đa {max} sản phẩm khác nhau. Bỏ một sản phẩm để chọn sản phẩm khác.',title:'Chọn nông sản',delivery:'Giao hàng',reselectHint:'Xác nhận trước hạn để tránh hủy đơn và hoàn điểm.',empty:'Chưa chọn sản phẩm.',remaining:'điểm còn lại',portion:'phần',perPortion:'điểm / phần',draft:'Lưu nháp',
    heldOnly:'Giới hạn đã giữ: {max} phần.',
    heldUndo:'Trước khi lưu, bạn có thể giảm, bỏ hoặc tăng lại đến mức đã giữ.',
    heldLimit:'Giảm xuống tối đa {max} phần đã giữ.',
    noStock:'Đợt này hiện không còn hàng khả dụng.',
    noQuota:'Nhóm này không đủ điểm cho một phần.',
    missingHold:'Không còn lượt giữ hiệu lực trong đợt. Hãy bỏ sản phẩm này để tiếp tục.',
  };
}
