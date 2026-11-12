import type {Locale} from '@/types';
export function csaSelectionCopy(locale: Locale) {
  return locale === 'en' ? {
    lineLimit:'Choose up to {max} different products. Remove one to choose another.',title:'Choose your produce',delivery:'Delivery',reselectHint:'Confirm before the deadline to avoid cancellation and a points refund.',empty:'No produce selected.',remaining:'points left',portion:'portion',perPortion:'points / portion',draft:'Save draft',
  } : {
    lineLimit:'Chọn tối đa {max} sản phẩm khác nhau. Bỏ một sản phẩm để chọn sản phẩm khác.',title:'Chọn nông sản',delivery:'Giao hàng',reselectHint:'Xác nhận trước hạn để tránh hủy đơn và hoàn điểm.',empty:'Chưa chọn sản phẩm.',remaining:'điểm còn lại',portion:'phần',perPortion:'điểm / phần',draft:'Lưu nháp',
  };
}
