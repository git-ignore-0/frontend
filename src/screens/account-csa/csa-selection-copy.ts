import type {Locale} from '@/types';
export function csaSelectionCopy(locale: Locale) {
  return locale === 'en' ? {
    lineLimit:'Choose up to {max} different products. Remove one to choose another.',title:'Choose your produce',delivery:'Delivery',reselectHint:'Confirm before the deadline to avoid cancellation and a points refund.',empty:'No produce selected.',remaining:'points left',portion:'portion',perPortion:'points / portion',draft:'Save draft',
    heldOnly:'This product is closed to new selections. You can keep, reduce or remove your hold, and restore the held quantity before saving.',
    heldLimit:'Your hold covers fewer portions than selected. Reduce the quantity to {max} or fewer.',
    noStock:'No stock available for this round.',
    noQuota:'This group has too few points for one portion.',
    missingHold:'This product is no longer in the catalog for this round and has no valid hold. Remove it to continue.',
  } : {
    lineLimit:'Chọn tối đa {max} sản phẩm khác nhau. Bỏ một sản phẩm để chọn sản phẩm khác.',title:'Chọn nông sản',delivery:'Giao hàng',reselectHint:'Xác nhận trước hạn để tránh hủy đơn và hoàn điểm.',empty:'Chưa chọn sản phẩm.',remaining:'điểm còn lại',portion:'phần',perPortion:'điểm / phần',draft:'Lưu nháp',
    heldOnly:'Sản phẩm không nhận lượt chọn mới. Bạn có thể giữ nguyên, giảm hoặc bỏ lượng đã giữ, và khôi phục lượng đó trước khi lưu.',
    heldLimit:'Số lượng đang chọn vượt mức đã giữ. Hãy giảm xuống tối đa {max}.',
    noStock:'Đợt này hiện không còn hàng khả dụng.',
    noQuota:'Nhóm này không đủ điểm cho một phần.',
    missingHold:'Sản phẩm không còn trong danh mục của đợt và không có lượt giữ hiệu lực. Hãy bỏ sản phẩm để tiếp tục.',
  };
}
