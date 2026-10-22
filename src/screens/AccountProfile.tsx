"use client";
import {useState, type FormEvent} from "react";
import {useWardOptions} from "@/hooks/useWardOptions";
import {Button,DataState,FormField,FormInput,FormSelect,Icon,Section} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {digits,formatAddress,validPhone} from "@/lib/format";
import type {Address,Profile} from "@/types";

export function ProfileView(){
 const {data,ui,patch,setData,act,call}=useNFV();
 const p=data.profile;
 return <Section title="Hồ sơ cá nhân" description="Thông tin liên hệ" actions={!ui.profileEditing&&<Button small onClick={()=>patch({profileEditing:true})}><Icon name="edit" size={14}/> {p.name?"Chỉnh sửa":"Bổ sung thông tin"}</Button>}>
   {ui.profileEditing?<ProfileEditor initial={p} cancel={()=>patch({profileEditing:false})} save={async value=>{
     const result=await act("save:profile",async()=>{const confirmed=await call<Profile|void>("saveProfile",value);return confirmed||value;},"Đã cập nhật hồ sơ");
     if(result){setData(s=>({...s,profile:{...s.profile,...(result||value)}}));patch({profileEditing:false});}
   }} busy={ui.busyKeys.includes("save:profile")}/>:
   <div className="acc-profile-info"><div><span>Họ và tên</span><strong>{p.name||"Chưa cập nhật"}</strong></div><div><span>Số điện thoại</span><strong>{p.phone||"Chưa cập nhật"}</strong></div><div><span>Email đăng nhập</span><strong>{p.email||"Chưa có thông tin"}</strong></div></div>}
 </Section>;
}
function ProfileEditor({initial,cancel,save,busy}:{initial:Profile;cancel:()=>void;save:(value:Profile)=>Promise<void>;busy:boolean}){
 const [value,setValue]=useState({...initial}),[touched,setTouched]=useState(false);
 const valid=value.name.trim().length>=2&&validPhone(value.phone);
 const changed=value.name!==initial.name||value.phone!==initial.phone;
 const update=(key:"name"|"phone",text:string)=>{setValue(s=>({...s,[key]:text}));setTouched(true);};
 return <form id="accountProfileForm" onSubmit={e=>{e.preventDefault();if(valid&&changed)void save(value);}}>
   <div className="acc-form-grid"><FormField label="Họ và tên *"><FormInput name="name" maxLength={80} required value={value.name} onChange={e=>update("name",e.target.value)}/></FormField>
   <FormField label="Số điện thoại *"><FormInput name="phone" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="09xxxxxxxx" required value={value.phone} onChange={e=>update("phone",digits(e.target.value))}/></FormField>
   <FormField label="Email đăng nhập" className="acc-wide"><FormInput readOnly value={initial.email}/></FormField></div>
   <div className="help-error" role="alert">{touched&&!valid?"Vui lòng điền đầy đủ thông tin hợp lệ.":""}</div>
   <div className="acc-form-actions"><Button type="submit" small disabled={!changed||!valid} loading={busy}>Lưu thay đổi</Button><Button small variant="outline" disabled={busy} onClick={cancel}>Hủy</Button></div>
 </form>;
}
export function AddressView(){
 const {data,ui,patch,setData,act,call}=useNFV();
 const address=data.addresses[0];
 return <Section className="acc-single-address" title="Địa chỉ giao hàng" description="Mỗi tài khoản lưu một địa chỉ dùng khi đặt hàng"
   actions={!ui.addressEditing&&<Button small onClick={()=>patch({addressEditing:true})}><Icon name={address?"edit":"plus"} size={14}/> {address?"Chỉnh sửa":"Thêm địa chỉ"}</Button>}>
   {ui.addressEditing?<AddressEditor initial={address||{name:data.profile.name,phone:data.profile.phone,city:"",ward:"",detail:"",isDefault:true}}
     isNew={!address} cancel={()=>patch({addressEditing:false})} busy={ui.busyKeys.includes("save:address")} save={async value=>{
       const result=await act("save:address",async()=>{const confirmed=await call<Address|void>("saveAddress",value);return confirmed||value;},"Đã cập nhật địa chỉ giao hàng");
       if(result){setData(s=>({...s,addresses:[{...value,...result,isDefault:true}]}));patch({addressEditing:false});}
     }}/>:
   address?<div className="acc-one-address-display"><div className="acc-one-address-head"><Icon name="pin" size={17}/> <span>Địa chỉ hiện tại</span></div><strong>{address.name}</strong><div className="acc-one-address-phone">{address.phone}</div><p>{formatAddress(address)}</p></div>:
    <DataState icon="pin" title="Chưa có địa chỉ giao hàng" description="Thêm địa chỉ để sử dụng khi đặt hàng."/>}
   <p className="acc-footnote">Đây là địa chỉ được lưu trong tài khoản. Bạn vẫn có thể nhập địa chỉ khác cho một đơn hàng mà không thay đổi địa chỉ đã lưu. Địa chỉ của đơn cũ luôn được giữ nguyên.</p>
 </Section>;
}
function AddressEditor({initial,isNew,cancel,save,busy}:{initial:Address;isNew:boolean;cancel:()=>void;save:(v:Address)=>Promise<void>;busy:boolean}){
 const {data}=useNFV();
 const [value,setValue]=useState(initial),[touched,setTouched]=useState(false);
 const wardOptions=useWardOptions(value.city);
 const valid=value.name.trim().length>=2&&validPhone(value.phone)&&data.provinces.includes(value.city)&&wardOptions.options.includes(value.ward)&&value.detail.trim().length>=3;
 const changed=isNew||(["name","phone","city","ward","detail"] as const).some(k=>value[k]!==initial[k]);
 const update=(key:keyof Address,v:string)=>{setValue(s=>({...s,[key]:v}));setTouched(true);};
 return <form id="accountAddressForm" className="acc-editor acc-one-address-form" onSubmit={(e:FormEvent)=>{e.preventDefault();if(valid&&changed)void save(value);}}>
   <div className="acc-editor-head"><h3>{isNew?"Thêm địa chỉ giao hàng":"Chỉnh sửa địa chỉ giao hàng"}</h3></div>
   <div className="acc-form-grid">
     <FormField label="Người nhận *"><FormInput name="name" maxLength={80} required placeholder="Họ và tên" autoComplete="name" value={value.name} onChange={e=>update("name",e.target.value)}/></FormField>
     <FormField label="Số điện thoại *"><FormInput name="phone" type="tel" inputMode="numeric" maxLength={10} placeholder="09xxxxxxxx" required value={value.phone} onChange={e=>update("phone",digits(e.target.value))}/></FormField>
     <FormField label="Tỉnh / thành phố *" className="acc-address-field"><FormSelect name="city" aria-label="Tỉnh hoặc thành phố" required value={value.city} onChange={e=>{setValue(s=>({...s,city:e.target.value,ward:""}));setTouched(true);}}><option value="">Chọn tỉnh/thành phố</option>{data.provinces.map(c=><option key={c}>{c}</option>)}</FormSelect></FormField>
     <FormField label="Xã / phường *" className="acc-address-field"><FormSelect name="ward" aria-label="Xã hoặc phường" required value={value.ward} disabled={!value.city||wardOptions.loading||!wardOptions.options.length} onChange={e=>update("ward",e.target.value)}><option value="">{!value.city?"Chọn tỉnh/thành phố trước":wardOptions.loading?"Đang tải xã/phường...":"Chọn xã/phường"}</option>
       {value.ward&&!wardOptions.loading&&!wardOptions.options.includes(value.ward)&&<option value={value.ward} disabled>{value.ward} (không còn hợp lệ)</option>}
       {wardOptions.options.map(c=><option key={c}>{c}</option>)}</FormSelect></FormField>
     <FormField label="Địa chỉ cụ thể *" className="acc-wide acc-address-field"><FormInput name="detail" required maxLength={180} placeholder="Số nhà, ngõ/ngách, đường, thôn/xóm" value={value.detail} onChange={e=>update("detail",e.target.value)}/></FormField>
   </div>
   {wardOptions.error&&<div className="help-error" role="alert">Không tải được danh sách xã/phường. <Button small variant="outline" onClick={()=>void wardOptions.retry()}>Thử lại</Button></div>}
   <div className="help-error" role="alert">{touched&&!valid?"Vui lòng điền đầy đủ thông tin hợp lệ.":""}</div>
   <div className="acc-form-actions"><Button type="submit" small loading={busy} disabled={!valid||!changed||wardOptions.loading}>Lưu địa chỉ</Button><Button variant="outline" small disabled={busy} onClick={cancel}>Hủy</Button></div>
 </form>;
}
